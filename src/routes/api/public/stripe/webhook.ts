import { createFileRoute } from "@tanstack/react-router";
import type { StripeSubscription, StripeInvoice } from "@/lib/billing.server";

type StripeWebhookEventObject = StripeSubscription &
  StripeInvoice & {
    subscription?: string | null;
    client_reference_id?: string | null;
  };

/**
 * Webhook Stripe.
 * URL à renseigner dans le dashboard Stripe :
 *   https://<ton-domaine>/api/public/stripe/webhook
 * Événements : checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted.
 * Secrets requis : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
 */
export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook non configuré", { status: 500 });

        const payload = await request.text();
        const { verifyStripeSignature, stripeRequest } = await import("@/lib/stripe.server");
        const valid = await verifyStripeSignature(
          payload,
          request.headers.get("stripe-signature"),
          secret,
        );
        if (!valid) return new Response("Signature invalide", { status: 401 });

        const event = JSON.parse(payload) as {
          type: string;
          data: { object: StripeWebhookEventObject };
        };
        const { applySubscriptionState, recordReferralCommission } =
          await import("@/lib/billing.server");

        try {
          switch (event.type) {
            case "invoice.payment_succeeded": {
              await recordReferralCommission(event.data.object);
              break;
            }
            case "checkout.session.completed": {
              const session = event.data.object;
              if (session.subscription) {
                const subscription = await stripeRequest<StripeSubscription>(
                  `/subscriptions/${encodeURIComponent(session.subscription)}`,
                  { method: "GET" },
                );
                if (!subscription.metadata?.["supabase_user_id"] && session.client_reference_id) {
                  subscription.metadata = {
                    ...(subscription.metadata ?? {}),
                    supabase_user_id: session.client_reference_id,
                  };
                }
                await applySubscriptionState(subscription);
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              await applySubscriptionState(event.data.object);
              break;
            }
            default:
              break;
          }
        } catch (error) {
          console.error("[stripe] webhook handling failed", error);
          return new Response("Erreur de traitement", { status: 500 });
        }

        return Response.json({ received: true });
      },
    },
  },
});

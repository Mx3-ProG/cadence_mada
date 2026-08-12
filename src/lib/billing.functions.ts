import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StripeSubscription } from "@/lib/billing.server";

const originSchema = z.object({ origin: z.string().url().max(300) });
const returnSchema = z.object({
  origin: z.string().url().max(300),
  sessionId: z.string().min(1).max(200),
});

/** Crée (ou récupère) le client Stripe lié au compte et démarre l'abonnement Pro. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => originSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { stripeRequest } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, stripe_customer_id, plan")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.plan === "pro") {
      return { alreadyPro: true as const };
    }

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripeRequest<{ id: string }>("/customers", {
        params: {
          email: profile?.email ?? undefined,
          name: profile?.full_name ?? undefined,
          metadata: { supabase_user_id: userId },
        },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const origin = data.origin.replace(/\/$/, "");
    const priceId = process.env["STRIPE_PRICE_ID"];

    const lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: 1000,
            recurring: { interval: "month" },
            product_data: { name: "Cadence Pro" },
          },
        };

    const session = await stripeRequest<{ id: string; url: string }>("/checkout/sessions", {
      params: {
        mode: "subscription",
        customer: customerId,
        client_reference_id: userId,
        allow_promotion_codes: true,
        line_items: [lineItem],
        subscription_data: { metadata: { supabase_user_id: userId } },
        metadata: { supabase_user_id: userId },
        success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard?checkout=cancelled`,
      },
    });

    return { url: session.url };
  });

/** Ouvre le portail de facturation Stripe (changer de carte, annuler). */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => originSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { stripeRequest } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.stripe_customer_id) throw new Error("Aucun abonnement Stripe pour ce compte.");

    const session = await stripeRequest<{ url: string }>("/billing_portal/sessions", {
      params: {
        customer: profile.stripe_customer_id,
        return_url: `${data.origin.replace(/\/$/, "")}/dashboard`,
      },
    });

    return { url: session.url };
  });

/**
 * Filet de sécurité au retour du checkout : synchronise le plan immédiatement,
 * sans attendre le webhook.
 */
export const syncCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => returnSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { stripeRequest } = await import("@/lib/stripe.server");
    const { applySubscriptionState } = await import("@/lib/billing.server");

    const session = await stripeRequest<{
      client_reference_id: string | null;
      customer: string | null;
      subscription: string | null;
      status: string;
    }>(`/checkout/sessions/${encodeURIComponent(data.sessionId)}`, { method: "GET" });

    if (session.client_reference_id !== context.userId) {
      throw new Error("Session de paiement non reconnue.");
    }
    if (!session.subscription) return { plan: "free" as const };

    const subscription = await stripeRequest<StripeSubscription>(
      `/subscriptions/${encodeURIComponent(session.subscription)}`,
      { method: "GET" },
    );

    return applySubscriptionState(subscription);
  });

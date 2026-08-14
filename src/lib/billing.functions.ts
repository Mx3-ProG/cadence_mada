import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StripeSubscription } from "@/lib/billing.server";
import type { PaidPlanTier } from "@/lib/plan";

const originSchema = z.object({ origin: z.string().url().max(300) });
const returnSchema = z.object({
  origin: z.string().url().max(300),
  sessionId: z.string().min(1).max(200),
});
const CANCEL_CONFIRMATION_PHRASE = "je me désabonne";
const cancelSchema = z.object({
  confirmText: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === CANCEL_CONFIRMATION_PHRASE, "Phrase de confirmation incorrecte."),
});

const paidTierSchema = z.enum(["basic", "standard", "economic", "business"]);

/** Nom de la variable d'environnement contenant le Price ID Stripe de chaque palier payant. */
const PRICE_ENV_BY_TIER: Record<PaidPlanTier, string> = {
  basic: "STRIPE_PRICE_ID_BASIC",
  standard: "STRIPE_PRICE_ID_STANDARD",
  economic: "STRIPE_PRICE_ID_ECONOMIC",
  business: "STRIPE_PRICE_ID_BUSINESS",
};

function priceIdForTier(tier: PaidPlanTier): string {
  const envVar = PRICE_ENV_BY_TIER[tier];
  const priceId = process.env[envVar];
  if (!priceId) throw new Error(`${envVar} manquante.`);
  return priceId;
}

const checkoutSchema = originSchema.extend({ tier: paidTierSchema });

/** Crée (ou récupère) le client Stripe lié au compte et démarre l'abonnement sur le palier choisi. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { stripeRequest } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, stripe_customer_id, stripe_subscription_id, plan")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.plan && profile.plan !== "free") {
      return { alreadyPaid: true as const, currentTier: profile.plan };
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
    const priceId = priceIdForTier(data.tier);

    const session = await stripeRequest<{ id: string; url: string }>("/checkout/sessions", {
      params: {
        mode: "subscription",
        customer: customerId,
        client_reference_id: userId,
        allow_promotion_codes: true,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: { metadata: { supabase_user_id: userId, plan_tier: data.tier } },
        metadata: { supabase_user_id: userId, plan_tier: data.tier },
        success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard?checkout=cancelled`,
      },
    });

    return { url: session.url };
  });

const changeTierSchema = z.object({ tier: paidTierSchema });

/** Change le palier d'un abonnement Stripe déjà actif (upgrade ou downgrade), avec proration. */
export const changeSubscriptionTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => changeTierSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { stripeRequest } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applySubscriptionState } = await import("@/lib/billing.server");
    const { userId } = context;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.stripe_subscription_id) {
      throw new Error("Aucun abonnement actif pour ce compte.");
    }

    const current = await stripeRequest<{ items: { data: { id: string }[] } }>(
      `/subscriptions/${encodeURIComponent(profile.stripe_subscription_id)}`,
      { method: "GET" },
    );
    const itemId = current.items.data[0]?.id;
    if (!itemId) throw new Error("Abonnement Stripe invalide.");

    const priceId = priceIdForTier(data.tier);
    const subscription = await stripeRequest<StripeSubscription>(
      `/subscriptions/${encodeURIComponent(profile.stripe_subscription_id)}`,
      {
        params: {
          items: [{ id: itemId, price: priceId }],
          proration_behavior: "create_prorations",
          metadata: { supabase_user_id: userId, plan_tier: data.tier },
        },
      },
    );

    return applySubscriptionState(subscription);
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
        return_url: `${data.origin.replace(/\/$/, "")}/settings#abonnement`,
      },
    });

    return { url: session.url };
  });

/**
 * Programme l'annulation de l'abonnement Pro à la fin de la période déjà payée.
 * Exige la phrase de confirmation exacte pour éviter les résiliations accidentelles.
 */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cancelSchema.parse(input))
  .handler(async ({ context }) => {
    const { stripeRequest } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applySubscriptionState } = await import("@/lib/billing.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.stripe_subscription_id) {
      throw new Error("Aucun abonnement actif pour ce compte.");
    }

    const subscription = await stripeRequest<StripeSubscription>(
      `/subscriptions/${encodeURIComponent(profile.stripe_subscription_id)}`,
      { params: { cancel_at_period_end: true } },
    );
    await applySubscriptionState(subscription);

    return { cancelAt: subscription.current_period_end ?? null };
  });

/** Annule la résiliation programmée : l'abonnement continue normalement. */
export const reactivateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { stripeRequest } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applySubscriptionState } = await import("@/lib/billing.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.stripe_subscription_id) {
      throw new Error("Aucun abonnement actif pour ce compte.");
    }

    const subscription = await stripeRequest<StripeSubscription>(
      `/subscriptions/${encodeURIComponent(profile.stripe_subscription_id)}`,
      { params: { cancel_at_period_end: false } },
    );
    await applySubscriptionState(subscription);

    return { reactivated: true as const };
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

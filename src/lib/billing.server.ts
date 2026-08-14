/**
 * Application côté base de l'état d'abonnement Stripe.
 * Server-only : utilise la clé service role pour contourner le garde-fou du plan.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { PlanTier } from "@/lib/plan";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
const VALID_PAID_TIERS = new Set(["basic", "standard", "economic", "business"]);

export type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
};

/** Met à jour le plan du profil correspondant au client Stripe. */
export async function applySubscriptionState(subscription: StripeSubscription) {
  const isActive = ACTIVE_STATUSES.has(subscription.status);
  const metaTier = subscription.metadata?.["plan_tier"];
  const plan: PlanTier =
    isActive && metaTier && VALID_PAID_TIERS.has(metaTier) ? (metaTier as PlanTier) : "free";
  const renewsAt = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const userId = subscription.metadata?.["supabase_user_id"];

  const query = supabaseAdmin.from("profiles").update({
    plan,
    plan_renews_at: renewsAt,
    subscription_status: subscription.status,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
  });

  const { error } = userId
    ? await query.eq("id", userId)
    : await query.eq("stripe_customer_id", subscription.customer);

  if (error) {
    console.error("[stripe] profile update failed", error.message);
    throw new Error(error.message);
  }

  return { plan };
}

const REFERRAL_COMMISSION_RATE = 0.3;

export type StripeInvoice = {
  id: string;
  customer: string;
  subscription?: string | null;
  amount_paid: number;
};

/**
 * Crédite 30% du montant payé au parrain du filleul, à chaque facture d'abonnement réglée.
 * Idempotent via la contrainte UNIQUE sur stripe_invoice_id (retries webhook Stripe sans risque).
 */
export async function recordReferralCommission(invoice: StripeInvoice) {
  if (invoice.amount_paid <= 0 || !invoice.subscription) return;

  const { stripeRequest } = await import("@/lib/stripe.server");
  const subscription = await stripeRequest<StripeSubscription>(
    `/subscriptions/${encodeURIComponent(invoice.subscription)}`,
    { method: "GET" },
  );
  const referredId = subscription.metadata?.["supabase_user_id"];
  if (!referredId) return;

  const { data: referred } = await supabaseAdmin
    .from("profiles")
    .select("referred_by")
    .eq("id", referredId)
    .maybeSingle();
  if (!referred?.referred_by) return;

  const amountCents = Math.round(invoice.amount_paid * REFERRAL_COMMISSION_RATE);
  if (amountCents <= 0) return;

  const { error } = await supabaseAdmin.from("referral_commissions").insert({
    referrer_id: referred.referred_by,
    referred_id: referredId,
    stripe_invoice_id: invoice.id,
    amount_cents: amountCents,
  });
  if (error && error.code !== "23505") {
    // 23505 = violation de contrainte UNIQUE (commission déjà enregistrée pour cette facture)
    console.error("[referral] commission insert failed", error.message);
  }
}

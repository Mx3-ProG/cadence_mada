/**
 * Application côté base de l'état d'abonnement Stripe.
 * Server-only : utilise la clé service role pour contourner le garde-fou du plan.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

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
  const plan = isActive ? "pro" : "free";
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

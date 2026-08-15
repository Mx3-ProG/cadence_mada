import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const TIER_ORDER = ["free", "basic", "standard", "economic", "business"] as const;
export type PlanTier = (typeof TIER_ORDER)[number];
export type PaidPlanTier = Exclude<PlanTier, "free">;

export const TIER_LIMITS: Record<
  PlanTier,
  { contacts: number | null; appointments: number | null }
> = {
  free: { contacts: 10, appointments: 15 },
  basic: { contacts: 30, appointments: 50 },
  standard: { contacts: 100, appointments: 250 },
  economic: { contacts: 250, appointments: 1000 },
  business: { contacts: null, appointments: null },
};

export const TIER_PRICES: Record<PlanTier, string> = {
  free: "0 €",
  basic: "19,99 €",
  standard: "69,99 €",
  economic: "139,99 €",
  business: "199,99 €",
};

export const TIER_LABELS: Record<PlanTier, string> = {
  free: "Free-mium",
  basic: "Basique",
  standard: "Standard",
  economic: "Economic",
  business: "Business",
};

/** Ancre stable de chaque offre sur la page publique des tarifs. */
export function tierPricingHash(tier: PlanTier): string {
  return `offre-${tier}`;
}

/** true si `plan` est au moins au niveau `min` dans l'ordre des paliers. */
export function hasTierAtLeast(plan: PlanTier | undefined, min: PlanTier): boolean {
  if (!plan) return false;
  return TIER_ORDER.indexOf(plan) >= TIER_ORDER.indexOf(min);
}

/**
 * true si l'utilisateur a accès à une fonctionnalité réservée au palier `min` — soit
 * parce que son plan le couvre, soit parce que c'est un administrateur (même bypass
 * que les triggers de quota côté base).
 */
export function hasFeatureAccess(usage: PlanUsage | undefined, min: PlanTier): boolean {
  return !!usage?.isAdmin || hasTierAtLeast(usage?.plan, min);
}

/** Le palier juste au-dessus de `plan`, ou null si déjà au sommet. */
export function nextTier(plan: PlanTier): PlanTier | null {
  const i = TIER_ORDER.indexOf(plan);
  return i >= 0 && i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1]! : null;
}

export type PlanUsage = {
  plan: PlanTier;
  planRenewsAt: string | null;
  contacts: number;
  appointmentsThisMonth: number;
  subscriptionStatus: string | null;
  isAdmin: boolean;
  cancelAtPeriodEnd: boolean;
};

export const planUsageQueryKey = ["plan-usage"] as const;

export async function fetchPlanUsage(): Promise<PlanUsage> {
  const { data, error } = await supabase.rpc("get_plan_usage");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    plan: (row?.plan as PlanTier) ?? "free",
    planRenewsAt: row?.plan_renews_at ?? null,
    contacts: row?.contacts_count ?? 0,
    appointmentsThisMonth: row?.appointments_this_month ?? 0,
    subscriptionStatus: row?.subscription_status ?? null,
    isAdmin: Boolean((row as { is_admin?: boolean } | undefined)?.is_admin),
    cancelAtPeriodEnd: Boolean(
      (row as { cancel_at_period_end?: boolean } | undefined)?.cancel_at_period_end,
    ),
  };
}

export function usePlanUsage() {
  return useQuery({ queryKey: planUsageQueryKey, queryFn: fetchPlanUsage });
}

export function isContactLimitReached(usage: PlanUsage | undefined) {
  if (!usage || usage.isAdmin) return false;
  const limit = TIER_LIMITS[usage.plan].contacts;
  return limit !== null && usage.contacts >= limit;
}

export function isAppointmentLimitReached(usage: PlanUsage | undefined) {
  if (!usage || usage.isAdmin) return false;
  const limit = TIER_LIMITS[usage.plan].appointments;
  return limit !== null && usage.appointmentsThisMonth >= limit;
}

/** Traduit les erreurs de limite renvoyées par la base en message lisible. */
export function planErrorMessage(message: string, usage?: PlanUsage): string | null {
  const upsell = usage ? nextTier(usage.plan) : null;
  const upsellText = upsell ? ` Passe au plan ${TIER_LABELS[upsell]} pour continuer.` : "";
  if (message.includes("FREE_PLAN_CONTACT_LIMIT")) {
    return `Limite de contacts atteinte pour ton plan.${upsellText}`;
  }
  if (message.includes("FREE_PLAN_APPOINTMENT_LIMIT")) {
    return `Limite de rendez-vous atteinte pour ton plan ce mois-ci.${upsellText}`;
  }
  return null;
}

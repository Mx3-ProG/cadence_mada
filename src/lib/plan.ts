import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const FREE_CONTACT_LIMIT = 30;
export const FREE_APPOINTMENT_LIMIT = 30;
export const PRO_PRICE_LABEL = "10 €";

export type PlanTier = "free" | "pro";

export type PlanUsage = {
  plan: PlanTier;
  planRenewsAt: string | null;
  contacts: number;
  appointmentsThisMonth: number;
  subscriptionStatus: string | null;
  isAdmin: boolean;
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
  };
}

export function usePlanUsage() {
  return useQuery({ queryKey: planUsageQueryKey, queryFn: fetchPlanUsage });
}

export function isContactLimitReached(usage: PlanUsage | undefined) {
  return !!usage && usage.plan === "free" && !usage.isAdmin && usage.contacts >= FREE_CONTACT_LIMIT;
}

export function isAppointmentLimitReached(usage: PlanUsage | undefined) {
  return (
    !!usage &&
    usage.plan === "free" &&
    !usage.isAdmin &&
    usage.appointmentsThisMonth >= FREE_APPOINTMENT_LIMIT
  );
}

/** Traduit les erreurs de limite renvoyées par la base en message lisible. */
export function planErrorMessage(message: string): string | null {
  if (message.includes("FREE_PLAN_CONTACT_LIMIT")) {
    return `Plan Gratuit : limite de ${FREE_CONTACT_LIMIT} contacts atteinte. Passe en Pro pour l'illimité.`;
  }
  if (message.includes("FREE_PLAN_APPOINTMENT_LIMIT")) {
    return `Plan Gratuit : limite de ${FREE_APPOINTMENT_LIMIT} rendez-vous ce mois-ci. Passe en Pro pour l'illimité.`;
  }
  return null;
}

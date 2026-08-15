import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendReferralInviteEmail } from "@/lib/referral.functions";
import type { PlanTier } from "@/lib/plan";

export type ReferralSummary = {
  referralCode: string;
  totalReferrals: number;
  proReferrals: number;
  balanceCents: number;
  lifetimeEarnedCents: number;
  hasPendingPayout: boolean;
};

export type ReferralRow = {
  id: string;
  displayName: string;
  plan: PlanTier;
  appointmentsThisMonth: number;
  createdAt: string;
};

export const REFERRAL_PAYOUT_MIN_CENTS = 2500;

export const referralSummaryQueryKey = ["referral-summary"] as const;
export const myReferralsQueryKey = ["my-referrals"] as const;

async function fetchReferralSummary(): Promise<ReferralSummary | null> {
  const { data, error } = await supabase.rpc("get_referral_summary");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    referralCode: row.referral_code,
    totalReferrals: row.total_referrals,
    proReferrals: row.pro_referrals,
    balanceCents: row.balance_cents,
    lifetimeEarnedCents: row.lifetime_earned_cents,
    hasPendingPayout: row.has_pending_payout,
  };
}

async function fetchMyReferrals(): Promise<ReferralRow[]> {
  const { data, error } = await supabase.rpc("get_my_referrals");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    plan: row.plan,
    appointmentsThisMonth: row.appointments_this_month,
    createdAt: row.created_at,
  }));
}

export function useReferralSummary() {
  return useQuery({ queryKey: referralSummaryQueryKey, queryFn: fetchReferralSummary });
}

export function useMyReferrals() {
  return useQuery({ queryKey: myReferralsQueryKey, queryFn: fetchMyReferrals });
}

/** Demande le retrait du solde disponible en entier (pas de montant libre). */
export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Non connecté.");
      // amount_cents est recalculé et imposé par le trigger enforce_payout_request_trigger.
      const { error } = await supabase
        .from("referral_payout_requests")
        .insert({ user_id: userId, amount_cents: 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: referralSummaryQueryKey });
    },
  });
}

/** Envoie une invitation de parrainage par email à l'adresse saisie. */
export function useSendReferralInvite() {
  return useMutation({
    mutationFn: async ({ email, locale }: { email: string; locale: string }) =>
      sendReferralInviteEmail({
        data: { email, locale, origin: window.location.origin },
      }),
  });
}

export function referralPayoutErrorMessage(error: unknown, t: (key: string) => string): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("REFERRAL_PAYOUT_ALREADY_PENDING")) {
    return t("referral.payout_errors.already_pending");
  }
  if (message.includes("REFERRAL_BALANCE_TOO_LOW")) {
    return t("referral.payout_errors.balance_too_low");
  }
  return t("referral.payout_errors.generic");
}

export function referralLink(code: string, locale: string) {
  return `${window.location.origin}/${locale}/auth?ref=${code}`;
}

export function formatCents(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export type TierProgress = {
  tierIndex: number;
  label: string;
  progressPercent: number;
  floor: number;
  ceiling: number | null;
};

export function getTierProgress(
  value: number,
  boundaries: number[],
  labels: string[],
): TierProgress {
  for (let i = 0; i < boundaries.length - 1; i++) {
    const floor = boundaries[i]!;
    const ceiling = boundaries[i + 1]!;
    if (value < ceiling) {
      const percent = ((value - floor) / (ceiling - floor)) * 100;
      return {
        tierIndex: i,
        label: labels[i]!,
        progressPercent: Math.min(100, Math.max(0, percent)),
        floor,
        ceiling,
      };
    }
  }
  const lastIndex = boundaries.length - 1;
  return {
    tierIndex: lastIndex,
    label: labels[lastIndex]!,
    progressPercent: 100,
    floor: boundaries[lastIndex]!,
    ceiling: null,
  };
}

export const REFERRAL_COUNT_BOUNDARIES = [0, 1, 5, 20, 100, 500];
export const REFERRAL_MONEY_BOUNDARIES_CENTS = [0, 1000, 5000, 10000, 30000, 100000];

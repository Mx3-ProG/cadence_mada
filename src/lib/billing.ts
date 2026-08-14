import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  cancelSubscription,
  changeSubscriptionTier,
  createBillingPortalSession,
  createCheckoutSession,
  reactivateSubscription,
} from "@/lib/billing.functions";
import { planUsageQueryKey, TIER_LABELS, type PaidPlanTier } from "@/lib/plan";

function stripeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("STRIPE_SECRET_KEY") || message.includes("STRIPE_PRICE_ID")) {
    return "Stripe n'est pas encore configuré pour ce palier.";
  }
  return "Le paiement n'a pas pu démarrer. Réessaie dans un instant.";
}

/**
 * Change le palier d'abonnement : lance le checkout Stripe si l'utilisateur est
 * actuellement Gratuit, ou modifie l'abonnement existant s'il est déjà sur un palier payant.
 */
export function useChangePlan() {
  const checkout = useServerFn(createCheckoutSession);
  const change = useServerFn(changeSubscriptionTier);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tier,
      hasActivePaidPlan,
    }: {
      tier: PaidPlanTier;
      hasActivePaidPlan: boolean;
    }) =>
      hasActivePaidPlan
        ? change({ data: { tier } })
        : checkout({ data: { tier, origin: window.location.origin } }),
    onSuccess: (result, variables) => {
      if ("alreadyPaid" in result && result.alreadyPaid) {
        toast.success("Ton plan est déjà actif.");
        void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
        return;
      }
      if ("url" in result && result.url) {
        window.location.href = result.url;
        return;
      }
      toast.success(`Tu es maintenant sur le plan ${TIER_LABELS[variables.tier]}.`);
      void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
    },
    onError: (error) => toast.error(stripeErrorMessage(error)),
  });
}

/** Ouvre le portail de facturation Stripe. */
export function useBillingPortal() {
  const portal = useServerFn(createBillingPortalSession);

  return useMutation({
    mutationFn: async () => portal({ data: { origin: window.location.origin } }),
    onSuccess: (result) => {
      if (result.url) window.location.href = result.url;
    },
    onError: (error) => toast.error(stripeErrorMessage(error)),
  });
}

/** Programme l'arrêt de l'abonnement Pro à la fin de la période déjà payée. */
export function useCancelSubscription() {
  const cancel = useServerFn(cancelSubscription);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (confirmText: string) => cancel({ data: { confirmText } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Résiliation impossible."),
  });
}

/** Annule une résiliation programmée : l'abonnement Pro continue. */
export function useReactivateSubscription() {
  const reactivate = useServerFn(reactivateSubscription);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => reactivate(),
    onSuccess: () => {
      toast.success("Ton abonnement Pro continue normalement.");
      void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Réactivation impossible."),
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createBillingPortalSession, createCheckoutSession } from "@/lib/billing.functions";
import { planUsageQueryKey } from "@/lib/plan";

function stripeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("STRIPE_SECRET_KEY")) {
    return "Stripe n'est pas encore configuré : ajoute ta clé STRIPE_SECRET_KEY.";
  }
  return "Le paiement n'a pas pu démarrer. Réessaie dans un instant.";
}

/** Lance le checkout Stripe pour l'abonnement Pro. */
export function useUpgradeToPro() {
  const checkout = useServerFn(createCheckoutSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => checkout({ data: { origin: window.location.origin } }),
    onSuccess: (result) => {
      if ("alreadyPro" in result && result.alreadyPro) {
        toast.success("Tu es déjà en plan Pro.");
        void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
        return;
      }
      if ("url" in result && result.url) window.location.href = result.url;
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

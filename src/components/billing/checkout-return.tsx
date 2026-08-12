import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { syncCheckoutSession } from "@/lib/billing.functions";
import { planUsageQueryKey } from "@/lib/plan";

/**
 * Au retour de Stripe (?checkout=success&session_id=...), synchronise le plan
 * sans attendre le webhook puis nettoie l'URL.
 */
export function CheckoutReturn() {
  const sync = useServerFn(syncCheckoutSession);
  const queryClient = useQueryClient();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (!status) return;
    handled.current = true;

    const sessionId = params.get("session_id");
    window.history.replaceState({}, "", window.location.pathname);

    if (status === "cancelled") {
      toast.info("Paiement annulé — tu restes sur le plan Gratuit.");
      return;
    }
    if (status !== "success" || !sessionId) return;

    void (async () => {
      try {
        await sync({ data: { origin: window.location.origin, sessionId } });
        await queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
        toast.success("Bienvenue en Pro : contacts et rendez-vous illimités.");
      } catch {
        toast.info("Paiement reçu, activation en cours. Recharge la page dans un instant.");
      }
    })();
  }, [queryClient, sync]);

  return null;
}

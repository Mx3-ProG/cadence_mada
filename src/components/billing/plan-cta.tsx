import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useChangePlan } from "@/lib/billing";
import { useLocale } from "@/i18n/use-locale";
import {
  fetchPlanUsage,
  planUsageQueryKey,
  TIER_LABELS,
  TIER_ORDER,
  type PaidPlanTier,
} from "@/lib/plan";

/**
 * Bouton de choix de palier sur la grille tarifaire : redirige vers l'inscription
 * si l'utilisateur n'est pas connecté, sinon lance/modifie l'abonnement Stripe.
 */
export function PlanCta({ tier }: { tier: PaidPlanTier }) {
  const locale = useLocale();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const changePlan = useChangePlan();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(!!data.session);
    });
    return () => {
      active = false;
    };
  }, []);

  const usageQuery = useQuery({
    queryKey: planUsageQueryKey,
    queryFn: fetchPlanUsage,
    enabled: signedIn === true,
  });

  const currentPlan = usageQuery.data?.plan;
  const label = TIER_LABELS[tier];

  if (currentPlan === tier) {
    return (
      <Button size="lg" variant="outline" className="mt-8 w-full" disabled>
        Plan actuel
      </Button>
    );
  }

  const isDowngrade = !!currentPlan && TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(currentPlan);
  const buttonLabel =
    !currentPlan || currentPlan === "free"
      ? `Passer à ${label}`
      : isDowngrade
        ? `Rétrograder vers ${label}`
        : `Passer à ${label}`;

  return (
    <Button
      size="lg"
      variant={isDowngrade ? "outline" : "default"}
      className="mt-8 w-full"
      disabled={changePlan.isPending}
      onClick={() =>
        signedIn
          ? changePlan.mutate({ tier, hasActivePaidPlan: !!currentPlan && currentPlan !== "free" })
          : navigate({ to: "/$locale/auth", params: { locale } })
      }
    >
      {changePlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {buttonLabel}
    </Button>
  );
}

import { Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChangePlan } from "@/lib/billing";
import { TIER_LABELS, type PaidPlanTier, type PlanTier } from "@/lib/plan";

/** Carte d'upsell générique affichée à la place d'une fonctionnalité verrouillée par palier. */
export function LockedFeatureCard({
  title,
  minTier,
  currentPlan,
}: {
  title: string;
  minTier: PaidPlanTier;
  currentPlan: PlanTier | undefined;
}) {
  const changePlan = useChangePlan();

  return (
    <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          <strong>{title}</strong> réservé au plan <strong>{TIER_LABELS[minTier]}</strong> et plus.
        </span>
      </p>
      <Button
        className="gap-2 sm:shrink-0"
        disabled={changePlan.isPending}
        onClick={() =>
          changePlan.mutate({
            tier: minTier,
            hasActivePaidPlan: !!currentPlan && currentPlan !== "free",
          })
        }
      >
        {changePlan.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Passer en {TIER_LABELS[minTier]}
      </Button>
    </div>
  );
}

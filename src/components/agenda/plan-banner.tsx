import { Crown, Loader2, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useChangePlan } from "@/lib/billing";
import {
  nextTier,
  TIER_LABELS,
  TIER_LIMITS,
  TIER_PRICES,
  usePlanUsage,
  type PaidPlanTier,
  type PlanUsage,
} from "@/lib/plan";

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const danger = value >= max;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className={danger ? "font-semibold text-destructive" : "font-semibold"}>
          {value} / {max}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            danger ? "bg-destructive" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PlanBanner({ usage }: { usage?: PlanUsage | undefined }) {
  const query = usePlanUsage();
  const changePlan = useChangePlan();
  const data = usage ?? query.data;
  if (!data) return null;

  if (data.plan === "business") {
    return (
      <div className="glass-panel mt-6 flex items-center gap-3 rounded-2xl px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          <Crown className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">Plan Business</span>{" "}
          <span className="text-muted-foreground">— contacts et rendez-vous illimités.</span>
        </p>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link to="/settings" hash="abonnement">
            Gérer l'abonnement
          </Link>
        </Button>
      </div>
    );
  }

  const upsell = nextTier(data.plan);
  const limits = TIER_LIMITS[data.plan];

  return (
    <div className="glass-panel mt-6 rounded-2xl p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-6">
          <Meter label="Contacts" value={data.contacts} max={limits.contacts ?? data.contacts} />
          <Meter
            label="Rendez-vous ce mois-ci"
            value={data.appointmentsThisMonth}
            max={limits.appointments ?? data.appointmentsThisMonth}
          />
        </div>
        {upsell && (
          <Button
            size="sm"
            className="shrink-0 gap-2"
            disabled={changePlan.isPending}
            onClick={() =>
              changePlan.mutate({
                tier: upsell as PaidPlanTier,
                hasActivePaidPlan: data.plan !== "free",
              })
            }
          >
            {changePlan.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Passer en {TIER_LABELS[upsell]} — {TIER_PRICES[upsell]}/mois
          </Button>
        )}
      </div>
    </div>
  );
}

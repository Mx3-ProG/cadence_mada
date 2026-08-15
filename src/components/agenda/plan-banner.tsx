import { Crown, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { nextTier, TIER_LIMITS, usePlanUsage, type PlanUsage } from "@/lib/plan";
import { useLocale } from "@/i18n/use-locale";

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
  const locale = useLocale();
  const { t } = useTranslation("app");
  const query = usePlanUsage();
  const data = usage ?? query.data;
  if (!data) return null;

  if (data.plan === "business") {
    return (
      <div className="glass-panel mt-6 flex items-center gap-3 rounded-2xl px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          <Crown className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">{t("plan_banner.business.title")}</span>{" "}
          <span className="text-muted-foreground">{t("plan_banner.business.subtitle")}</span>
        </p>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link to="/$locale/settings" params={{ locale }} hash="abonnement">
            {t("plan_banner.business.manage_cta")}
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
          <Meter
            label={t("plan_banner.meter.contacts")}
            value={data.contacts}
            max={limits.contacts ?? data.contacts}
          />
          <Meter
            label={t("plan_banner.meter.appointments")}
            value={data.appointmentsThisMonth}
            max={limits.appointments ?? data.appointmentsThisMonth}
          />
        </div>
        {upsell && (
          <Button asChild size="sm" className="shrink-0 gap-2">
            <Link to="/$locale/tarifs" params={{ locale }}>
              <Zap className="h-3.5 w-3.5" />
              {t("plan_banner.upgrade_cta")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

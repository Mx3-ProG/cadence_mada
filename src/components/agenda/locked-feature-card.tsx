import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { tierPricingHash, TIER_LABELS, type PaidPlanTier, type PlanTier } from "@/lib/plan";
import { useLocale } from "@/i18n/use-locale";

/** Carte d'upsell générique affichée à la place d'une fonctionnalité verrouillée par palier. */
export function LockedFeatureCard({
  title,
  minTier,
}: {
  title: string;
  minTier: PaidPlanTier;
  currentPlan: PlanTier | undefined;
}) {
  const locale = useLocale();
  const { t } = useTranslation("app");
  return (
    <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          <strong>{title}</strong>
          {t("locked_feature.reserved_suffix")}
          <strong>{TIER_LABELS[minTier]}</strong>
          {t("locked_feature.reserved_and_above")}
        </span>
      </p>
      <Button asChild className="gap-2 sm:shrink-0">
        <Link to="/$locale/tarifs" params={{ locale }} hash={tierPricingHash(minTier)}>
          <Sparkles className="h-4 w-4" />
          {t("locked_feature.cta", { tier: TIER_LABELS[minTier] })}
        </Link>
      </Button>
    </div>
  );
}

/**
 * Aperçu flouté d'une fonctionnalité verrouillée par palier : la fonctionnalité réelle
 * (`children`) reste visible en arrière-plan sous un flou, pour donner un avant-goût sans
 * permettre l'usage ni la lecture des données, avec un cadre d'upsell superposé au centre.
 */
export function FeatureTeaser({
  title,
  minTier,
  children,
}: {
  title: string;
  minTier: PaidPlanTier;
  children: ReactNode;
}) {
  const locale = useLocale();
  const { t } = useTranslation("app");
  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl">
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none select-none blur-md brightness-[.85] saturate-75"
      >
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-5">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-primary/40 bg-background/80 p-5 text-center shadow-lg backdrop-blur-sm">
          <Lock className="h-5 w-5 text-primary" />
          <p className="text-sm">
            <strong>{title}</strong>
            {t("locked_feature.reserved_suffix")}
            <strong>{TIER_LABELS[minTier]}</strong>
            {t("locked_feature.reserved_and_above")}
          </p>
          <Button asChild className="gap-2">
            <Link to="/$locale/tarifs" params={{ locale }} hash={tierPricingHash(minTier)}>
              <Sparkles className="h-4 w-4" />
              {t("locked_feature.cta", { tier: TIER_LABELS[minTier] })}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

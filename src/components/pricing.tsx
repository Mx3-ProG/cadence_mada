import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { PlanCta } from "@/components/billing/plan-cta";
import { useLocale } from "@/i18n/use-locale";
import {
  tierPricingHash,
  TIER_LABELS,
  TIER_LIMITS,
  TIER_PRICES,
  TIER_ORDER,
  type PaidPlanTier,
  type PlanTier,
} from "@/lib/plan";

const highlightedTier: PlanTier = "standard";

export function Pricing({
  checkout = false,
  showIntro = true,
}: {
  checkout?: boolean;
  showIntro?: boolean;
}) {
  const locale = useLocale();
  const { t } = useTranslation("pricing");

  const plans = TIER_ORDER.map((tier) => {
    const limits = TIER_LIMITS[tier];
    return {
      tier,
      name: TIER_LABELS[tier],
      period: tier === "free" ? t("period.forever") : t("period.monthly"),
      tagline: t(`plans.${tier}.tagline`),
      cta: t(`plans.${tier}.cta`, { label: TIER_LABELS[tier] }),
      features: t(`plans.${tier}.features`, {
        returnObjects: true,
        contacts: limits.contacts,
        appointments: limits.appointments,
        economicLabel: TIER_LABELS.economic,
      }) as string[],
      highlighted: tier === highlightedTier,
    };
  });

  return (
    <section id="pricing" className="scroll-mt-24 px-4 pb-28 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {showIntro && (
          <Reveal>
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t("intro.badge")}
              </span>
              <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("intro.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
                {t("intro.subtitle", { freeLabel: TIER_LABELS.free })}
              </p>
            </div>
          </Reveal>
        )}

        <div
          className={`${showIntro ? "mt-12" : "mt-14"} grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`}
        >
          {plans.map((plan, i) => (
            <Reveal key={plan.tier} delay={i * 0.06}>
              <article
                id={tierPricingHash(plan.tier)}
                className={`relative flex h-full scroll-mt-28 flex-col overflow-hidden rounded-[1.75rem] border bg-background/80 p-6 shadow-[0_18px_55px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-300 target:border-primary target:ring-2 target:ring-primary/35 hover:-translate-y-1 hover:shadow-[0_24px_65px_-36px_rgba(15,23,42,0.5)] ${
                  plan.highlighted
                    ? "border-primary/45 ring-1 ring-primary/20 shadow-glow"
                    : "border-border/70"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden />
                )}
                {plan.highlighted && (
                  <span className="mb-5 w-fit rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {t("recommended")}
                  </span>
                )}
                <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-black tracking-tight">
                    {TIER_PRICES[plan.tier]}
                  </span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </p>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.tier === "free" ? (
                  <Button asChild size="lg" variant="outline" className="mt-8 w-full">
                    <Link to="/$locale/auth" params={{ locale }}>
                      {plan.cta}
                    </Link>
                  </Button>
                ) : checkout ? (
                  <PlanCta tier={plan.tier as PaidPlanTier} />
                ) : (
                  <Button asChild size="lg" className="mt-8 w-full">
                    <Link
                      to="/$locale/tarifs"
                      params={{ locale }}
                      hash={tierPricingHash(plan.tier)}
                    >
                      {t("view_offer", { name: plan.name })}
                    </Link>
                  </Button>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

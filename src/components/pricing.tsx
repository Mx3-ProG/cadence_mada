import { Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { PlanCta } from "@/components/billing/plan-cta";
import {
  tierPricingHash,
  TIER_LABELS,
  TIER_LIMITS,
  TIER_PRICES,
  type PaidPlanTier,
} from "@/lib/plan";

const plans = [
  {
    tier: "free" as const,
    name: TIER_LABELS.free,
    period: "pour toujours",
    tagline: "Parfait pour organiser ta semaine et tester les confirmations par lien.",
    features: [
      `Jusqu'à ${TIER_LIMITS.free.contacts} contacts`,
      `${TIER_LIMITS.free.appointments} rendez-vous envoyés par mois`,
      "Liens de confirmation illimités",
      "Agenda simple (vue semaine)",
      "Programme de parrainage (30% à vie)",
      "Mode jour / nuit",
    ],
    cta: "Commencer gratuitement",
    highlighted: false,
  },
  {
    tier: "basic" as const,
    name: TIER_LABELS.basic,
    period: "par mois",
    tagline: "Un peu plus de marge pour un agenda qui commence à se remplir.",
    features: [
      `Jusqu'à ${TIER_LIMITS.basic.contacts} contacts`,
      `${TIER_LIMITS.basic.appointments} rendez-vous par mois`,
      "Liens de confirmation illimités",
      "Agenda simple (vue semaine)",
      "Programme de parrainage (30% à vie)",
      "Mode jour / nuit",
    ],
    cta: `Passer en ${TIER_LABELS.basic}`,
    highlighted: false,
  },
  {
    tier: "standard" as const,
    name: TIER_LABELS.standard,
    period: "par mois",
    tagline: "Pour celles et ceux qui enchaînent les rendez-vous chaque semaine.",
    features: [
      `Jusqu'à ${TIER_LIMITS.standard.contacts} contacts`,
      `${TIER_LIMITS.standard.appointments} rendez-vous par mois`,
      "Agenda complet : vue semaine & mois, création en un clic",
      "Statistiques de la semaine",
      "Réservation en libre-service via ton lien public",
      "Programme de parrainage (30% à vie)",
    ],
    cta: "Passer en Standard",
    highlighted: true,
  },
  {
    tier: "economic" as const,
    name: TIER_LABELS.economic,
    period: "par mois",
    tagline: "Pour une activité qui tourne à plein régime toute l'année.",
    features: [
      `Jusqu'à ${TIER_LIMITS.economic.contacts} contacts`,
      `${TIER_LIMITS.economic.appointments} rendez-vous par mois`,
      "Tout Standard : agenda complet, réservation",
      "Tendance du mois",
      "Programme de parrainage (30% à vie)",
    ],
    cta: `Passer en ${TIER_LABELS.economic}`,
    highlighted: false,
  },
  {
    tier: "business" as const,
    name: TIER_LABELS.business,
    period: "par mois",
    tagline: "Pour les équipes et les marques qui veulent tout, sans limite.",
    features: [
      "Contacts et rendez-vous illimités",
      `Tout ${TIER_LABELS.economic} : agenda complet, réservation, tendance du mois`,
      "Lien d'invitation personnalisé (branding + message)",
      "Avis Google : note, lien Google My Business et Maps",
      "Lien site internet sur tes invitations",
      "Support prioritaire",
    ],
    cta: "Passer en Business",
    highlighted: false,
  },
];

export function Pricing({
  checkout = false,
  showIntro = true,
}: {
  checkout?: boolean;
  showIntro?: boolean;
}) {
  return (
    <section id="pricing" className="scroll-mt-24 px-4 pb-28 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {showIntro && (
          <Reveal>
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Tarifs simples
              </span>
              <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                5 paliers, une seule règle : tu paies pour ce dont tu as besoin
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
                Aucune carte demandée pour le plan {TIER_LABELS.free}. Change de palier à tout
                moment, sans engagement.
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
                    Recommandé
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
                    <Link to="/auth">{plan.cta}</Link>
                  </Button>
                ) : checkout ? (
                  <PlanCta tier={plan.tier as PaidPlanTier} />
                ) : (
                  <Button asChild size="lg" className="mt-8 w-full">
                    <Link to="/tarifs" hash={tierPricingHash(plan.tier)}>
                      Voir l’offre {plan.name}
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

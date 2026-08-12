import { Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { ProCta } from "@/components/billing/pro-cta";
import { FREE_APPOINTMENT_LIMIT, FREE_CONTACT_LIMIT } from "@/lib/plan";

const plans = [
  {
    name: "Gratuit",
    price: "0 €",
    period: "pour toujours",
    tagline: "Parfait pour organiser ta semaine et tester les confirmations par lien.",
    features: [
      `Jusqu'à ${FREE_CONTACT_LIMIT} contacts`,
      `${FREE_APPOINTMENT_LIMIT} rendez-vous envoyés par mois`,
      "Liens de confirmation illimités",
      "Notes de préparation & statistiques",
      "Mode jour / nuit",
    ],
    cta: "Commencer gratuitement",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "10 €",
    period: "par mois",
    tagline: "Pour celles et ceux qui enchaînent les rendez-vous toute l'année.",
    features: [
      "Contacts illimités",
      "Rendez-vous illimités (au-delà des 30/mois du Gratuit)",
      "Invitations par email",
      "Lien d'invitation personnalisé (branding + message)",
      "Avis Google : note, lien Google My Business et Maps",
      "Statistiques croisées complètes",
      "Support prioritaire",
    ],
    cta: "Passer en Pro",
    highlighted: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 px-4 pb-28 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Tarifs simples
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Gratuit pour démarrer, Pro quand ça s'accélère
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
              Aucune carte demandée pour le plan Gratuit. Le plan Pro lève toutes les limites pour
              10 € par mois, sans engagement.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08}>
              <article
                className={`glass-panel relative h-full rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1 ${
                  plan.highlighted ? "ring-1 ring-primary/60 shadow-glow" : ""
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Recommandé
                  </span>
                )}
                <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-black tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </p>

                <ul className="mt-6 space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.highlighted ? (
                  <ProCta label={plan.cta} />
                ) : (
                  <Button asChild size="lg" variant="outline" className="mt-8 w-full">
                    <Link to="/auth">{plan.cta}</Link>
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

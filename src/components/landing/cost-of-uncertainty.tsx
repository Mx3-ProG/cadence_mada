import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Reveal } from "@/components/reveal";

type PainCard = { value: string; label: string };

export function CostOfUncertainty() {
  const { t } = useTranslation("home");
  const cards = t("pain.cards", { returnObjects: true }) as PainCard[];

  return (
    <section className="px-4 pb-28 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("pain.badge")}
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t("pain.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
              {t("pain.subtitle")}
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {cards.map((card, i) => (
            <Reveal key={card.label} delay={i * 0.08}>
              <div className="glass-panel h-full rounded-2xl p-6 text-center">
                <p className="font-display text-2xl font-black tracking-tight text-gradient">
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{card.label}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
            {t("pain.note")}
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-muted-foreground/70">
            {t("pain.disclaimer")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

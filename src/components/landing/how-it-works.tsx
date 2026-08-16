import { useTranslation } from "react-i18next";
import { CalendarCheck2, CalendarDays, Sparkles, UserPlus } from "lucide-react";
import { Reveal } from "@/components/reveal";

type TextCard = { title: string; text: string };

const stepIcons = [CalendarDays, UserPlus, CalendarCheck2];

export function HowItWorks() {
  const { t } = useTranslation("home");
  const steps = t("how.steps", { returnObjects: true }) as TextCard[];

  return (
    <section id="how-it-works" className="scroll-mt-24 px-4 pb-28 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("how.badge")}
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t("how.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
              {t("how.subtitle")}
            </p>
          </div>
        </Reveal>

        <div className="relative mt-14 grid gap-8 md:grid-cols-3">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
          />
          {steps.map((step, i) => {
            const StepIcon = stepIcons[i]!;
            return (
              <Reveal key={step.title} delay={i * 0.1}>
                <div className="relative flex flex-col items-center text-center">
                  <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full border border-primary/40 bg-background font-display text-sm font-bold text-primary shadow-glow">
                    {i + 1}
                  </span>
                  <div className="glass-panel mt-5 flex h-full w-full flex-col items-center rounded-2xl p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
                      <StepIcon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

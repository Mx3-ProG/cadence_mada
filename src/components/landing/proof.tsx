import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Reveal } from "@/components/reveal";

type Pillar = { title: string; text: string };

export function Proof() {
  const { t } = useTranslation("home");
  const pillars = t("proof.pillars", { returnObjects: true }) as Pillar[];

  return (
    <section className="px-4 pb-28 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("proof.badge")}
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t("proof.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
              {t("proof.subtitle")}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass-panel mx-auto mt-10 max-w-md rounded-2xl p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("proof.example_label")}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("proof.example_sent")}</span>
                  <span>18/20</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
                  <div className="h-full w-[90%] rounded-full bg-primary" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("proof.example_answered")}</span>
                  <span>15/18</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-success/15">
                  <div className="h-full w-[83%] rounded-full bg-success" />
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 0.08}>
              <article className="glass-panel h-full rounded-2xl p-6">
                <h3 className="font-display text-base font-bold">{pillar.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{pillar.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

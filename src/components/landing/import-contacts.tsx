import { useTranslation } from "react-i18next";
import { Check, FileUp, Sparkles } from "lucide-react";
import { Reveal } from "@/components/reveal";

export function ImportContacts() {
  const { t } = useTranslation("home");
  const bullets = t("import.bullets", { returnObjects: true }) as string[];

  return (
    <section className="px-4 pb-28 sm:px-6">
      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <div className="glass-panel flex flex-col items-center justify-center rounded-3xl p-10 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/12 text-primary">
              <FileUp className="h-7 w-7" />
            </span>
            <p className="mt-4 text-sm text-muted-foreground">CSV · vCard (.vcf)</p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("import.badge")}
          </span>
          <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("import.title")}
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">{t("import.subtitle")}</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{bullet}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-display text-sm font-semibold text-primary">
            {t("import.cta_note")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

import { useTranslation } from "react-i18next";
import { Building2, Clock, Phone, Sparkles, StickyNote, UserRound } from "lucide-react";
import { Reveal } from "@/components/reveal";

type ContactField = { label: string; value: string };

const fieldIcons = [Building2, UserRound, Phone, Clock, StickyNote];

export function ContactContext() {
  const { t } = useTranslation("home");
  const fields = t("contact_context.fields", { returnObjects: true }) as ContactField[];

  return (
    <section className="px-4 pb-28 sm:px-6">
      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("contact_context.badge")}
          </span>
          <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("contact_context.title")}
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            {t("contact_context.subtitle")}
          </p>
          <p className="mt-6 font-display text-sm font-semibold text-primary">
            {t("contact_context.cta_note")}
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass-panel rounded-3xl p-6 shadow-glow sm:p-7">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/12 font-display text-sm font-bold text-primary">
                CM
              </span>
              <div>
                <p className="font-display text-base font-bold">Camille Marchand</p>
                <p className="text-xs text-muted-foreground">{t("contact_context.person_role")}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {fields.map((field, i) => {
                const FieldIcon = fieldIcons[i]!;
                return (
                  <li key={field.label} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FieldIcon className="h-3.5 w-3.5" />
                    </span>
                    <span>
                      <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                        {field.label}
                      </span>
                      <span className="text-foreground/90">{field.value}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

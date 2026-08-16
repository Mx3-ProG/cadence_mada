import { useTranslation } from "react-i18next";
import { KeyRound, Lock, ShieldCheck, Sparkles, Webhook } from "lucide-react";
import { Reveal } from "@/components/reveal";

type SecurityItem = { title: string; text: string };

const icons = [Lock, KeyRound, ShieldCheck, Webhook];

export function Security() {
  const { t } = useTranslation("home");
  const items = t("security.items", { returnObjects: true }) as SecurityItem[];

  return (
    <section className="px-4 pb-28 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("security.badge")}
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t("security.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
              {t("security.subtitle")}
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {items.map((item, i) => {
            const ItemIcon = icons[i]!;
            return (
              <Reveal key={item.title} delay={i * 0.06}>
                <article className="glass-panel flex h-full items-start gap-4 rounded-2xl p-6">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                    <ItemIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

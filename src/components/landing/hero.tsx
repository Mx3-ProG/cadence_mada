import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/use-locale";
import { trackEvent } from "@/lib/analytics";
import { AppointmentPreview } from "./pending-to-confirmed";

type PreviewItem = { day: string; time: string; title: string; status: "accepted" | "pending" };

export function LandingHero() {
  const locale = useLocale();
  const { t } = useTranslation("home");

  const previewItems = t("preview.items", { returnObjects: true }) as PreviewItem[];
  const audienceItems = t("hero.audience_items", { returnObjects: true }) as string[];

  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" />
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-40" />

      <div className="mx-auto max-w-3xl text-center">
        <motion.p
          data-reveal=""
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {t("hero.badge")}
        </motion.p>

        <motion.h1
          data-reveal=""
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-6 font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl"
        >
          {t("hero.title_prefix")}{" "}
          <span className="text-gradient">{t("hero.title_highlight")}</span>
        </motion.h1>

        <motion.p
          data-reveal=""
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
        >
          {t("hero.subtitle")}
        </motion.p>

        <motion.div
          data-reveal=""
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg" className="gap-2" onClick={() => trackEvent("hero_cta_click")}>
            <Link to="/$locale/auth" params={{ locale }}>
              {t("hero.cta_primary")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            onClick={() => trackEvent("secondary_cta_click")}
          >
            <a href="#how-it-works">{t("hero.cta_secondary")}</a>
          </Button>
        </motion.div>

        <motion.p
          data-reveal=""
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.26 }}
          className="mt-4 text-xs text-muted-foreground"
        >
          {t("hero.microcopy")}
        </motion.p>

        <motion.div
          data-reveal=""
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <span className="font-medium text-foreground/70">{t("hero.audience_label")}</span>
          {audienceItems.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border/60 bg-surface/60 px-2.5 py-1"
            >
              {item}
            </span>
          ))}
          <span>{t("hero.audience_suffix")}</span>
        </motion.div>
      </div>

      <AppointmentPreview items={previewItems} />
    </section>
  );
}

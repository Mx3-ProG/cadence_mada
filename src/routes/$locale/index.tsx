import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  Check,
  Crown,
  GraduationCap,
  HeartPulse,
  Home,
  Link2,
  Mail,
  MessageCircle,
  MoonStar,
  Scale,
  Sparkles,
  StickyNote,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Reveal } from "@/components/reveal";
import { Pricing } from "@/components/pricing";
import { LandingSkeleton } from "@/components/loading/page-skeletons";
import { legalLinks } from "@/components/legal/legal-page";
import { openCookieSettings } from "@/components/legal/cookie-consent";
import { TIER_LABELS } from "@/lib/plan";
import { BrandLogo } from "@/components/brand-logo";
import { LandingCtaDock } from "@/components/landing-cta-dock";
import { useLocale } from "@/i18n/use-locale";

export const Route = createFileRoute("/$locale/")({
  pendingComponent: LandingSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  // SEO meta stays French-only for now — per-locale <head> translation is
  // follow-up work (needs hreflang/canonical wiring alongside it).
  head: () => ({
    meta: [
      { title: "Cadence — L’agenda qui libère ton esprit" },
      {
        name: "description",
        content:
          "Retrouve une semaine claire : tes clients réservent et confirment, tes contacts et tes notes restent à portée de main, ton activité avance sans relances.",
      },
      { property: "og:title", content: "Cadence — Ta semaine claire, enfin" },
      {
        property: "og:description",
        content:
          "Imagine tes rendez-vous organisés, tes clients rassurés et ta journée plus légère. Cadence s’occupe du reste.",
      },
    ],
  }),
  component: Landing,
});

const featureIcons = [
  CalendarDays,
  CalendarRange,
  UserPlus,
  Link2,
  Mail,
  Users,
  StickyNote,
  MoonStar,
];
const featurePro = [false, true, true, false, false, false, false, false];

const audienceIcons = [
  Briefcase,
  MessageCircle,
  HeartPulse,
  Home,
  Scale,
  Wrench,
  GraduationCap,
  Users,
  CalendarCheck2,
];

const howItWorksIcons = [CalendarDays, UserPlus, CalendarCheck2];

type PreviewItem = { day: string; time: string; title: string; status: "accepted" | "pending" };
type TextCard = { title: string; text: string };

function Landing() {
  const locale = useLocale();
  const { t } = useTranslation("home");
  const { t: tCommon } = useTranslation("common");
  const { t: tLegal } = useTranslation("legal");

  const previewItems = t("preview.items", { returnObjects: true }) as PreviewItem[];
  const howSteps = t("how.steps", { returnObjects: true }) as TextCard[];
  const audiences = t("audiences.items", { returnObjects: true }) as TextCard[];
  const features = t("features.items", { returnObjects: true }) as TextCard[];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:flex sm:justify-between sm:px-6">
          <BrandLogo />
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/$locale/tarifs"
              params={{ locale }}
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              {t("nav.pricing")}
            </Link>
            <LanguageSwitcher />
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="rounded-full border border-border/60"
            >
              <Link
                to="/$locale/contact"
                params={{ locale }}
                aria-label={tCommon("nav.contact_aria")}
              >
                <MessageCircle className="h-4 w-4" />
              </Link>
            </Button>
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/$locale/auth" params={{ locale }}>
                {tCommon("nav.start")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
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
              <Button asChild size="lg" className="gap-2">
                <Link to="/$locale/auth" params={{ locale }}>
                  {t("hero.cta_primary")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/$locale/dashboard" params={{ locale }}>
                  {t("hero.cta_secondary")}
                </Link>
              </Button>
            </motion.div>
          </div>

          <Reveal delay={0.25}>
            <div className="glass-panel mx-auto mt-16 max-w-4xl rounded-3xl p-4 shadow-glow sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {previewItems.map((item, i) => (
                  <motion.div
                    key={item.title}
                    data-reveal=""
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 * i }}
                    className="rounded-2xl border border-border/70 bg-surface/70 p-4 text-left"
                  >
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {item.day}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold">{item.time}</p>
                    <p className="mt-1 truncate text-sm">{item.title}</p>
                    <p
                      className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        item.status === "accepted"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      }`}
                    >
                      <Check className="h-3 w-3" /> {t(`preview.status.${item.status}`)}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section className="px-4 pb-28 sm:px-6">
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
              {howSteps.map((step, i) => {
                const StepIcon = howItWorksIcons[i]!;
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

        <section className="px-4 pb-28 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t("audiences.badge")}
                </span>
                <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  {t("audiences.title")}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
                  {t("audiences.subtitle")}
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {audiences.map((a, i) => {
                const AudienceIcon = audienceIcons[i]!;
                return (
                  <Reveal key={a.title} delay={i * 0.06}>
                    <article className="glass-panel h-full rounded-2xl p-6">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
                        <AudienceIcon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 font-display text-lg font-bold">{a.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{a.text}</p>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 pb-28 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("features.title")}
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
                const FeatureIcon = featureIcons[i]!;
                return (
                  <Reveal key={f.title} delay={i * 0.06}>
                    <article className="glass-panel relative h-full rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1 hover:shadow-glow">
                      {featurePro[i] && (
                        <Badge className="absolute right-4 top-4 gap-1 bg-primary/12 text-primary hover:bg-primary/12">
                          <Crown className="h-3 w-3" /> {TIER_LABELS.standard}
                        </Badge>
                      )}
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
                        <FeatureIcon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <Pricing />

        <section className="px-4 pb-28 sm:px-6">
          <Reveal>
            <div className="glass-panel mx-auto max-w-3xl rounded-3xl px-6 py-14 text-center sm:px-10">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("final.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground">
                {t("final.subtitle")}
              </p>
              <Button asChild size="lg" className="mt-8 gap-2">
                <Link to="/$locale/auth" params={{ locale }}>
                  {t("final.cta")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border/60 px-4 py-8 pb-28 text-center text-xs text-muted-foreground sm:px-6">
        <p>{t("footer.tagline")}</p>
        <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {legalLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              params={{ locale }}
              className="transition-colors hover:text-foreground"
            >
              {tLegal(l.labelKey)}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => openCookieSettings()}
            className="transition-colors hover:text-foreground"
          >
            {t("footer.cookie_prefs")}
          </button>
        </nav>
      </footer>

      <LandingCtaDock />
    </div>
  );
}

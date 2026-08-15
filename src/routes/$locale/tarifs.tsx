import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { Pricing } from "@/components/pricing";
import { LandingCtaDock } from "@/components/landing-cta-dock";
import { useLocale } from "@/i18n/use-locale";

export const Route = createFileRoute("/$locale/tarifs")({
  // SEO meta stays French-only for now — per-locale <head> translation is
  // follow-up work (needs hreflang/canonical wiring alongside it).
  head: () => ({
    meta: [
      { title: "Tarifs — Cadence" },
      {
        name: "description",
        content:
          "5 paliers, de Free-mium (0 €) à Business (199,99 €/mois) : contacts et rendez-vous, agenda complet, réservation en libre-service, branding personnalisé. Programme de parrainage inclus dès le plan Free-mium.",
      },
      { property: "og:title", content: "Tarifs — Cadence" },
      {
        property: "og:description",
        content: "Compare les 5 paliers de Cadence et choisis en un clic.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/tarifs" },
    ],
    links: [{ rel: "canonical", href: "/tarifs" }],
  }),
  component: TarifsPage,
});

function TarifsPage() {
  const locale = useLocale();
  const { t } = useTranslation("pricing");
  const { t: tCommon } = useTranslation("common");
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/$locale" params={{ locale }} className="flex items-center gap-2.5">
            <BrandLogo />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/$locale/auth" params={{ locale }}>
                {tCommon("nav.start")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative pb-24">
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] opacity-55" />
        <section className="px-4 pb-2 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex rounded-full border border-border/70 bg-background/70 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-xl">
            {t("page.badge")}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-black tracking-[-0.04em] sm:text-6xl">
            {t("page.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("page.subtitle")}
          </p>
          <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-sm">
            <span>{t("page.trust.stripe")}</span>
            <span>{t("page.trust.cancel")}</span>
            <span>{t("page.trust.instant")}</span>
          </div>
        </section>

        <Pricing checkout showIntro={false} />
      </main>

      <LandingCtaDock />
    </div>
  );
}

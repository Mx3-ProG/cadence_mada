import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { Pricing } from "@/components/pricing";
import { LandingSkeleton } from "@/components/loading/page-skeletons";
import { legalLinks } from "@/components/legal/legal-page";
import { openCookieSettings } from "@/components/legal/cookie-consent";
import { LandingCtaDock } from "@/components/landing-cta-dock";
import { LandingHeader } from "@/components/landing/header";
import { LandingHero } from "@/components/landing/hero";
import { CostOfUncertainty } from "@/components/landing/cost-of-uncertainty";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ContactContext } from "@/components/landing/contact-context";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { Proof } from "@/components/landing/proof";
import { Security } from "@/components/landing/security";
import { ImportContacts } from "@/components/landing/import-contacts";
import { Faq } from "@/components/landing/faq";
import { trackEvent } from "@/lib/analytics";
import { useLocale } from "@/i18n/use-locale";

export const Route = createFileRoute("/$locale/")({
  pendingComponent: LandingSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  // SEO meta stays French-only for now — per-locale <head> translation is
  // follow-up work (needs hreflang/canonical wiring alongside it).
  head: () => ({
    meta: [
      { title: "Cadence — L’agenda qui confirme tout seul" },
      {
        name: "description",
        content:
          "Cadence transforme chaque proposition de rendez-vous en confirmation claire et garde le contexte de chaque client à portée de main. Gratuit pour toujours, sans carte bancaire.",
      },
      { property: "og:title", content: "Cadence — Ton agenda, sans les trous ni les oublis" },
      {
        property: "og:description",
        content:
          "Rendez-vous confirmés, contacts en contexte, semaine sous contrôle. Cadence s’occupe du reste.",
      },
    ],
  }),
  component: Landing,
});

type TextCard = { title: string; text: string };

function Landing() {
  const locale = useLocale();
  const { t } = useTranslation("home");
  const { t: tLegal } = useTranslation("legal");

  const features = t("features.items", { returnObjects: true }) as TextCard[];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <LandingHeader />

      <main>
        <LandingHero />
        <CostOfUncertainty />
        <HowItWorks />
        <ContactContext />
        <RoiCalculator />
        <Proof />
        <Security />
        <ImportContacts />

        <section className="px-4 pb-28 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("features.title")}
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.06}>
                  <article className="glass-panel relative h-full rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1 hover:shadow-glow">
                    <h3 className="font-display text-lg font-bold">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <Pricing />
        <Faq />

        <section className="px-4 pb-28 sm:px-6">
          <Reveal>
            <div className="glass-panel mx-auto max-w-3xl rounded-3xl px-6 py-14 text-center sm:px-10">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("final.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground">
                {t("final.subtitle")}
              </p>
              <Button
                asChild
                size="lg"
                className="mt-8 gap-2"
                onClick={() => trackEvent("signup_started")}
              >
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

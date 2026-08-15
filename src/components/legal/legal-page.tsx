import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { useLocale } from "@/i18n/use-locale";
import { DEFAULT_LOCALE } from "@/i18n/config";

export const legalLinks = [
  { to: "/$locale/mentions-legales", labelKey: "nav.mentions" },
  { to: "/$locale/confidentialite", labelKey: "nav.confidentialite" },
  { to: "/$locale/cgu", labelKey: "nav.cgu" },
  { to: "/$locale/cookies", labelKey: "nav.cookies" },
  { to: "/$locale/documentation", labelKey: "nav.documentation" },
] as const;

// Legal content is machine-translated; French remains the legally
// authoritative version until each translation has been reviewed.
const LAST_UPDATED = new Date("2026-08-06T00:00:00Z");

export function LegalPage({
  title,
  currentDocPath,
  children,
}: {
  title: string;
  /** This page's own route (e.g. "/$locale/cgu"), to link to its French original. */
  currentDocPath?: string;
  children: ReactNode;
}) {
  const locale = useLocale();
  const { t } = useTranslation("legal");
  const updatedAt = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(LAST_UPDATED);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/$locale" params={{ locale }} className="flex items-center gap-2.5">
            <BrandLogo />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          to="/$locale"
          params={{ locale }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("back_home")}
        </Link>

        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">{t("updated_at", { date: updatedAt })}</p>

        {locale !== DEFAULT_LOCALE && (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            {t("authoritative.notice")}{" "}
            {currentDocPath && (
              <Link
                to={currentDocPath}
                params={{ locale: DEFAULT_LOCALE }}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {t("authoritative.link")}
              </Link>
            )}
          </div>
        )}

        <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:mt-1 [&_p]:mt-2 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>

        <nav className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          {legalLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              params={{ locale }}
              className="transition-colors hover:text-foreground"
            >
              {t(l.labelKey)}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}

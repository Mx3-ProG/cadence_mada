import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { useLocale } from "@/i18n/use-locale";

export function LandingHeader() {
  const locale = useLocale();
  const { t } = useTranslation("home");
  const { t: tCommon } = useTranslation("common");

  return (
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
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SECTIONS = [
  { id: "settings-account", labelKey: "quick_nav.items.account" },
  { id: "settings-subscription", labelKey: "quick_nav.items.subscription" },
  { id: "settings-history", labelKey: "quick_nav.items.history" },
  { id: "settings-referral", labelKey: "quick_nav.items.referral" },
  { id: "settings-help", labelKey: "quick_nav.items.help" },
  { id: "settings-booking", labelKey: "quick_nav.items.booking" },
  { id: "settings-branding", labelKey: "quick_nav.items.branding" },
  { id: "settings-docs", labelKey: "quick_nav.items.docs" },
  { id: "settings-password", labelKey: "quick_nav.items.password" },
  { id: "settings-delete", labelKey: "quick_nav.items.delete" },
] as const;

/** Popup de navigation rapide entre les cartes de la page settings, ouvert depuis le header. */
export function SettingsQuickNav() {
  const { t } = useTranslation("settings");
  const [open, setOpen] = useState(false);

  const goTo = (id: string) => {
    setOpen(false);
    const el = document.getElementById(id);
    el?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("quick_nav.trigger_aria")}
          className="rounded-full border border-border/60"
        >
          <ListChecks className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("quick_nav.title")}
        </p>
        <div className="mt-1 grid gap-0.5">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => goTo(section.id)}
              className="rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {t(section.labelKey)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

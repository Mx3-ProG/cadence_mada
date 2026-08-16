import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LOCALES, LOCALE_COOKIE_NAME, type Locale } from "@/i18n/config";

const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
  ru: "Русский",
  ar: "العربية",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  zh: "中文",
  hi: "हिन्दी",
};

/**
 * Sélecteur de langue pour les pages hors de /$locale/* (invité/client sans compte) :
 * bascule uniquement l'instance i18next locale à la page, sans navigation ni changement
 * d'URL (il n'y a pas de segment /$locale à faire correspondre sur ces routes).
 */
export function GuestLanguageSwitcher({ ariaLabel }: { ariaLabel: string }) {
  const { i18n } = useTranslation();

  const switchTo = (next: string) => {
    if (!next || next === i18n.language) return;
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=31536000; samesite=lax`;
    void i18n.changeLanguage(next);
  };

  return (
    <Select value={i18n.language} onValueChange={switchTo}>
      <SelectTrigger aria-label={ariaLabel} className="h-9 w-auto gap-1.5 rounded-full px-3">
        <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {SUPPORTED_LOCALES.map((code) => (
          <SelectItem key={code} value={code}>
            {LOCALE_LABELS[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

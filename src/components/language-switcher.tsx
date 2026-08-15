import { useRouter, useRouterState } from "@tanstack/react-router";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LOCALES, LOCALE_COOKIE_NAME, type Locale } from "@/i18n/config";
import { useLocale } from "@/i18n/use-locale";

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

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const switchTo = (next: string) => {
    if (!next || next === locale) return;
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=31536000; samesite=lax`;
    const rest = pathname.startsWith(`/${locale}`) ? pathname.slice(`/${locale}`.length) : pathname;
    void router.navigate({ href: `/${next}${rest || "/"}`, replace: true });
  };

  return (
    <Select value={locale} onValueChange={switchTo}>
      <SelectTrigger
        aria-label="Choisir la langue"
        className="h-9 w-auto gap-1.5 rounded-full border-border/60 px-3"
      >
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

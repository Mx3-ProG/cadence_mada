import {
  fr,
  enUS,
  de,
  ru,
  ar,
  es,
  it,
  pt,
  zhCN,
  hi,
  type Locale as DateFnsLocale,
} from "date-fns/locale";

export type { DateFnsLocale };
import { useLocale } from "./use-locale";
import type { Locale } from "./config";

const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = {
  fr,
  en: enUS,
  de,
  ru,
  ar,
  es,
  it,
  pt,
  zh: zhCN,
  hi,
};

export function useDateFnsLocale(): DateFnsLocale {
  const locale = useLocale();
  return DATE_FNS_LOCALES[locale];
}

/** Pour les pages hors de /$locale/* (invité/client sans compte) où la langue vient
 * d'une détection serveur (cookie/Accept-Language) plutôt que de l'URL. */
export function dateFnsLocale(locale: Locale): DateFnsLocale {
  return DATE_FNS_LOCALES[locale];
}

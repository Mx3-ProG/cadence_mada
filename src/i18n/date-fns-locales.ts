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

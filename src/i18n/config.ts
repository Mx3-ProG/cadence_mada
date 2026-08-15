export const SUPPORTED_LOCALES = [
  "fr",
  "en",
  "de",
  "ru",
  "ar",
  "es",
  "it",
  "pt",
  "zh",
  "hi",
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export const LOCALE_COOKIE_NAME = "cadence_locale";

export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ar"]);

export function isSupportedLocale(value: string | undefined | null): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function localeDirection(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

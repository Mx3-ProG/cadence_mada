import type { Locale } from "./config";

// BCP-47 tags used for Intl.* formatting. Region picks are defaults (en-US,
// pt-PT, ar with no region) — revisit if the business wants en-GB/pt-BR/a
// specific Arabic region once real usage data exists.
export const BCP47_TAGS: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-US",
  de: "de-DE",
  ru: "ru-RU",
  ar: "ar",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  zh: "zh-CN",
  hi: "hi-IN",
};

export function bcp47(locale: Locale): string {
  return BCP47_TAGS[locale];
}

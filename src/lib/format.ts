import { BCP47_TAGS } from "@/i18n/bcp47";
import type { Locale } from "@/i18n/config";

// Currency stays EUR regardless of UI language (France-based billing) —
// only the number formatting (grouping, decimal separator, symbol
// placement) adapts to the locale.
export function formatCentsLocalized(cents: number, locale: Locale): string {
  return (cents / 100).toLocaleString(BCP47_TAGS[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export function formatDateTime(iso: string | null, locale: Locale): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat(BCP47_TAGS[locale], { dateStyle: "long", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function formatDayMonth(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(BCP47_TAGS[locale], { day: "numeric", month: "short" }).format(date);
}

export function formatLongDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(BCP47_TAGS[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

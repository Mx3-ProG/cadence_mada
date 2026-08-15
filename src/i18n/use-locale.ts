import { useParams } from "@tanstack/react-router";
import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from "./config";

// Reads the active locale from the matched /$locale/* route segment.
// Falls back to the default locale for routes that render outside it
// (root error boundaries, the redirect routes).
export function useLocale(): Locale {
  const params = useParams({ strict: false }) as { locale?: string };
  return isSupportedLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
}

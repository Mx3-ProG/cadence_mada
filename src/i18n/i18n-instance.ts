import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { DEFAULT_NAMESPACE, NAMESPACES } from "./namespaces";

// Built fresh per route match (server: per request, client: per navigation)
// from resources already resolved by the route loader — never fetches on its
// own, so server and client always render from byte-identical translation
// data and hydration can't desync.
export function createI18nInstance(
  locale: Locale,
  resources: Record<string, Record<string, string>>,
): I18nInstance {
  const instance = i18next.createInstance();
  instance.use(initReactI18next);
  void instance.init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    ns: NAMESPACES,
    defaultNS: DEFAULT_NAMESPACE,
    resources: { [locale]: resources },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}

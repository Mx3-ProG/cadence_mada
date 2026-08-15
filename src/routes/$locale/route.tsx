import { useMemo } from "react";
import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";
import { isSupportedLocale, type Locale } from "@/i18n/config";
import { detectLocaleFromCurrentRequest } from "@/i18n/detect-locale";
import { loadNamespaces } from "@/i18n/resources";
import { NAMESPACES } from "@/i18n/namespaces";
import { createI18nInstance } from "@/i18n/i18n-instance";

export const Route = createFileRoute("/$locale")({
  // A first path segment that isn't a supported locale code (e.g. /tarifs,
  // matched here as params.locale === "tarifs") means this is really a
  // pre-i18n bookmarked URL, not an invalid locale — forward it to the
  // locale-prefixed equivalent instead of 404ing.
  beforeLoad: async ({ params, location }) => {
    if (!isSupportedLocale(params.locale)) {
      const detected = await detectLocaleFromCurrentRequest();
      throw redirect({ href: `/${detected}${location.pathname}`, replace: true });
    }
    return { locale: params.locale };
  },
  loader: async ({ params }) => {
    const i18nResources = await loadNamespaces(params.locale as Locale, NAMESPACES);
    return { i18nResources };
  },
  component: LocaleLayout,
});

function LocaleLayout() {
  const { locale } = Route.useRouteContext();
  const { i18nResources } = Route.useLoaderData();
  const i18n = useMemo(() => createI18nInstance(locale, i18nResources), [locale, i18nResources]);

  return (
    <I18nextProvider i18n={i18n}>
      <Outlet />
    </I18nextProvider>
  );
}

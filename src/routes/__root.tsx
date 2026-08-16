import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { ThemeProvider, themeInitScript } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/legal/cookie-consent";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  localeDirection,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/i18n/config";

const SITE_URL = "https://www.cadencemada.com";

function useResolvedLocale(): Locale {
  const matches = useRouterState({ select: (state) => state.matches });
  for (const routeMatch of matches) {
    const value = (routeMatch.params as Record<string, unknown> | undefined)?.["locale"];
    if (typeof value === "string" && isSupportedLocale(value)) return value;
  }
  return DEFAULT_LOCALE;
}

/**
 * Canonical + hreflang <link> tags pour la page actuellement matchée.
 * Sur une route `/$locale/...`, génère une alternative par langue supportée
 * (même chemin, préfixe de langue différent) + un x-default vers le français.
 * Sur une route sans préfixe de langue (ex: /invite/:token), se limite à un
 * canonical simple, sans alternates.
 */
function seoLinkTags(matches: ReadonlyArray<{ pathname: string; params?: unknown }>) {
  const leaf = matches[matches.length - 1];
  const rawPathname = leaf?.pathname ?? "/";
  // Normalise le slash final : les redirections de l'app (ex: "/" -> "/fr") et les
  // <Link> internes pointent vers des chemins sans slash final, donc le canonical doit
  // matcher exactement pour éviter un canonical qui pointe vers une URL jamais servie telle quelle.
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/+$/, "") : rawPathname;

  let locale: Locale | null = null;
  for (const match of matches) {
    const value = (match.params as Record<string, unknown> | undefined)?.["locale"];
    if (typeof value === "string" && isSupportedLocale(value)) {
      locale = value;
      break;
    }
  }

  const links: { rel: string; href: string; hreflang?: string }[] = [];

  if (locale) {
    const suffix = pathname.slice(pathname.indexOf(locale) + locale.length);
    for (const altLocale of SUPPORTED_LOCALES) {
      links.push({
        rel: "alternate",
        hreflang: altLocale,
        href: `${SITE_URL}/${altLocale}${suffix}`,
      });
    }
    links.push({
      rel: "alternate",
      hreflang: "x-default",
      href: `${SITE_URL}/${DEFAULT_LOCALE}${suffix}`,
    });
  }

  links.push({ rel: "canonical", href: `${SITE_URL}${pathname}` });
  return links;
}

// Entrance animations server-render at opacity 0 and rely on the client to
// reveal them, so any hydration failure leaves a blank page with the content
// present but invisible. This watchdog runs before hydration: if React has not
// marked the document hydrated within the grace period, it flags the failure so
// styles.css can force every [data-reveal] element visible. Content stays
// readable even when the JS bundle dies.
const HYDRATION_GRACE_MS = 4000;

export const hydrationWatchdogScript = `(function(){try{var d=document.documentElement;setTimeout(function(){if(!d.hasAttribute("data-hydrated"))d.setAttribute("data-hydration-failed","");},${HYDRATION_GRACE_MS});}catch(e){}})();`;

function useHydrationSignal() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-hydrated", "");
    root.removeAttribute("data-hydration-failed");
  }, []);
}

function NotFoundComponent() {
  const locale = useResolvedLocale();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/$locale"
            params={{ locale }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Cette page n'a pas pu se charger
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Un souci est survenu. Réessaie ou reviens à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ matches }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cadence — agenda de rendez-vous" },
      {
        name: "description",
        content:
          "Organise ta semaine de rendez-vous, garde le contexte sur chaque contact et fais confirmer tes créneaux par lien.",
      },
      { name: "author", content: "Cadence" },
      { name: "theme-color", content: "#12352e" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-cadence.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Cadence — Un rendez-vous confirmé sans relance",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/og-cadence.png" },
      { name: "twitter:image:alt", content: "Cadence — Un rendez-vous confirmé sans relance" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
      ...seoLinkTags(matches),
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const locale = useResolvedLocale();
  return (
    <html lang={locale} dir={localeDirection(locale)} suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: hydrationWatchdogScript }} />
        {/* The watchdog above is itself JS, so it cannot cover JS being off
            entirely — this does. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;filter:none!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const router = useRouter();
  const { queryClient } = router.options.context;

  useHydrationSignal();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <CookieConsent />
        <Toaster position="top-center" richColors />
        <Analytics />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

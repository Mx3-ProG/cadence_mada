import { createIsomorphicFn } from "@tanstack/react-start";
import { match } from "@formatjs/intl-localematcher";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./config";

// Isomorphic entry point for route beforeLoad/redirect logic. The server
// branch does full Accept-Language/cookie negotiation (see
// detect-locale.server.ts); dynamic-importing it here keeps its Node-only
// deps (negotiator, getRequest) out of the client bundle, since TanStack
// Start's import-protection plugin forbids client code from statically
// importing any `*.server.*` module. The client branch only runs if this
// beforeLoad ever re-executes during a client-side navigation.
export const detectLocaleFromCurrentRequest = createIsomorphicFn()
  .server(async () => {
    const { detectLocaleFromRequestContext } = await import("./detect-locale.server");
    return detectLocaleFromRequestContext();
  })
  .client(async () => {
    try {
      return match(navigator.languages as string[], SUPPORTED_LOCALES, DEFAULT_LOCALE) as Locale;
    } catch {
      return DEFAULT_LOCALE;
    }
  });

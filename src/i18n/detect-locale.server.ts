import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { getRequest } from "@tanstack/react-start/server";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type Locale,
} from "./config";

function localeFromCookie(cookieHeader: string | null): Locale | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`));
  if (!match) return undefined;
  const value = decodeURIComponent(match.slice(LOCALE_COOKIE_NAME.length + 1));
  return isSupportedLocale(value) ? value : undefined;
}

function localeFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  try {
    const negotiator = new Negotiator({ headers: { "accept-language": acceptLanguage } });
    const requested = negotiator.languages();
    if (requested.length === 0) return DEFAULT_LOCALE;
    return match(requested, SUPPORTED_LOCALES, DEFAULT_LOCALE) as Locale;
  } catch {
    return DEFAULT_LOCALE;
  }
}

// Priority: explicit user cookie override > Accept-Language negotiation > default.
// URL-param precedence (when a $locale segment is already present) is handled by
// the caller, since only the caller knows whether the URL supplied one.
export function detectLocale(request: Request): Locale {
  const fromCookie = localeFromCookie(request.headers.get("cookie"));
  if (fromCookie) return fromCookie;
  return localeFromAcceptLanguage(request.headers.get("accept-language"));
}

// Convenience for call sites (route beforeLoad, redirect routes) that run
// during SSR but don't already have the Request object at hand.
export function detectLocaleFromRequestContext(): Locale {
  const request = getRequest();
  if (!request) return DEFAULT_LOCALE;
  return detectLocale(request);
}

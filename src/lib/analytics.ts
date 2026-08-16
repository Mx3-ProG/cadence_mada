import { track as vercelTrack } from "@vercel/analytics/react";

// Landing funnel events (see docs brief) — typed here so every call site
// agrees on the exact event names instead of ad hoc strings.
export type LandingEvent =
  | "hero_cta_click"
  | "secondary_cta_click"
  | "roi_calculator_interaction"
  | "pricing_view"
  | "plan_free_click"
  | "plan_basic_click"
  | "plan_standard_click"
  | "plan_economic_click"
  | "plan_business_click"
  | "faq_open"
  | "signup_started"
  | "contact_import_started";

type EventProps = Record<string, string | number | boolean | null>;

/**
 * Wraps @vercel/analytics' `track()` so a blocked/absent analytics script
 * (ad blockers, no consent) never throws inside a click handler.
 */
export function trackEvent(name: LandingEvent, props?: EventProps): void {
  try {
    vercelTrack(name, props);
  } catch {
    // no-op — analytics must never break the interaction it's observing.
  }
}

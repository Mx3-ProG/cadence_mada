// Namespaces loaded for every page under /$locale/*. Kept as one flat list
// (rather than per-route lazy loading) while only a handful of public pages
// are translated — small enough payload that the simplicity is worth it.
// Revisit with per-route namespace splitting once the authenticated app
// (dashboard/agenda/contacts/settings) joins the translated surface.
export const NAMESPACES = [
  "common",
  "home",
  "pricing",
  "contact",
  "documentation",
  "auth",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NAMESPACE: Namespace = "common";

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
  "legal",
  "app",
  "dashboard",
  "agenda",
  "contacts",
  "settings",
] as const;

// Namespaces chargés ponctuellement par des routes/fonctions hors de /$locale/*
// (pages invité/client sans compte, templates d'email serveur) — pas dans NAMESPACES
// ci-dessus pour ne pas alourdir le chargement de chaque page de l'app.
export const INVITE_NAMESPACES = ["invite"] as const;
export const BOOKING_NAMESPACES = ["booking"] as const;
export const EMAIL_NAMESPACES = ["emails"] as const;

export type Namespace =
  | (typeof NAMESPACES)[number]
  | (typeof INVITE_NAMESPACES)[number]
  | (typeof BOOKING_NAMESPACES)[number]
  | (typeof EMAIL_NAMESPACES)[number];

export const DEFAULT_NAMESPACE: Namespace = "common";

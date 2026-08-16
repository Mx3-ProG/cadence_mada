import { loadNamespacesWithFallback } from "../../src/i18n/resources.ts";
import { DEFAULT_LOCALE, type Locale } from "../../src/i18n/config.ts";
import type { EmailT } from "./shared.ts";

export type { EmailT };

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, String(value));
  }
  return result;
}

/**
 * Traducteur minimal pour les templates d'email (langue du compte de l'expéditeur —
 * le destinataire n'a pas de compte donc pas de préférence stockée). Pas besoin de la
 * machinerie i18next complète côté serveur : juste une recherche de clé avec repli sur
 * le français, cohérente avec loadNamespacesWithFallback utilisé ailleurs dans l'app.
 */
export async function createEmailTranslator(locale: Locale): Promise<EmailT> {
  const resources = await loadNamespacesWithFallback(locale, ["emails"]);
  const primary = resources[locale]?.["emails"] ?? {};
  const fallback = resources[DEFAULT_LOCALE]?.["emails"] ?? {};

  return (key, vars) => interpolate(primary[key] ?? fallback[key] ?? key, vars);
}

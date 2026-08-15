import { DEFAULT_LOCALE, type Locale } from "./config";
import type { Namespace } from "./namespaces";

// import.meta.glob code-splits every locale JSON file into its own chunk and
// works identically in the server and client bundles (unlike fs-based or
// Node-only i18next backends), so this file needs no server/client split.
const modules = import.meta.glob<{ default: Record<string, string> }>("../locales/*/*.json");

async function loadNamespace(
  locale: Locale,
  namespace: Namespace,
): Promise<Record<string, string>> {
  const key = `../locales/${locale}/${namespace}.json`;
  const loader = modules[key];
  if (!loader) return {};
  const mod = await loader();
  return mod.default;
}

async function loadAllNamespaces(
  locale: Locale,
  namespaces: readonly Namespace[],
): Promise<Record<string, Record<string, string>>> {
  const entries = await Promise.all(
    namespaces.map(async (ns) => [ns, await loadNamespace(locale, ns)] as const),
  );
  return Object.fromEntries(entries);
}

// Loads the target locale's resources plus the French (reference) ones as an
// i18next fallback bundle: any key not yet translated for `locale` — e.g. a
// namespace added before that language's translation pass — renders the
// French text instead of the raw key or crashing on `returnObjects` calls.
export async function loadNamespacesWithFallback(
  locale: Locale,
  namespaces: readonly Namespace[],
): Promise<Record<Locale, Record<string, Record<string, string>>>> {
  if (locale === DEFAULT_LOCALE) {
    const resources = await loadAllNamespaces(locale, namespaces);
    return { [locale]: resources } as Record<Locale, Record<string, Record<string, string>>>;
  }
  const [resources, fallbackResources] = await Promise.all([
    loadAllNamespaces(locale, namespaces),
    loadAllNamespaces(DEFAULT_LOCALE, namespaces),
  ]);
  return {
    [locale]: resources,
    [DEFAULT_LOCALE]: fallbackResources,
  } as Record<Locale, Record<string, Record<string, string>>>;
}

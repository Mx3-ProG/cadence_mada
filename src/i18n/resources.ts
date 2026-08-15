import type { Locale } from "./config";
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

export async function loadNamespaces(
  locale: Locale,
  namespaces: readonly Namespace[],
): Promise<Record<string, Record<string, string>>> {
  const entries = await Promise.all(
    namespaces.map(async (ns) => [ns, await loadNamespace(locale, ns)] as const),
  );
  return Object.fromEntries(entries);
}

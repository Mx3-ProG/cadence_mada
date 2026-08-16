#!/usr/bin/env node
// Vérifie que chaque locale a les mêmes clés que le français (référence) pour chaque
// namespace de traduction. Signale les clés manquantes (jamais traduites) et en trop
// (probablement un reliquat après un renommage/suppression côté fr).
//
// Usage : npm run i18n:check
//   --strict   fait échouer (exit 1) aussi sur les clés "en trop", pas seulement manquantes.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "..", "src", "locales");
const REFERENCE_LOCALE = "fr";
const strict = process.argv.includes("--strict");

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function keysOf(obj) {
  // Les fichiers de locale sont plats (clés type "section.sous_cle"), mais certaines
  // valeurs sont des tableaux (ex: referral.count_labels) — on ne descend pas dedans,
  // seule la présence de la clé de premier niveau compte.
  return new Set(Object.keys(obj));
}

const locales = readdirSync(localesDir).filter(
  (entry) => existsSync(path.join(localesDir, entry)) && entry !== REFERENCE_LOCALE,
);

const referenceDir = path.join(localesDir, REFERENCE_LOCALE);
const namespaces = readdirSync(referenceDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();

let hasMissing = false;
let hasExtra = false;
const rows = [];

for (const locale of locales.sort()) {
  for (const namespace of namespaces) {
    const refFile = path.join(referenceDir, `${namespace}.json`);
    const localeFile = path.join(localesDir, locale, `${namespace}.json`);

    const refKeys = keysOf(readJson(refFile));

    if (!existsSync(localeFile)) {
      hasMissing = true;
      rows.push({ locale, namespace, status: "MISSING FILE", missing: refKeys.size, extra: 0 });
      continue;
    }

    const localeKeys = keysOf(readJson(localeFile));
    const missing = [...refKeys].filter((k) => !localeKeys.has(k));
    const extra = [...localeKeys].filter((k) => !refKeys.has(k));

    if (missing.length) hasMissing = true;
    if (extra.length) hasExtra = true;

    if (missing.length || extra.length) {
      rows.push({
        locale,
        namespace,
        status: "diff",
        missing: missing.length,
        extra: extra.length,
        missingKeys: missing,
        extraKeys: extra,
      });
    }
  }
}

if (!rows.length) {
  console.log(
    `✓ Toutes les locales sont alignées sur ${REFERENCE_LOCALE} (${namespaces.length} namespaces).`,
  );
  process.exit(0);
}

console.log(`Référence : ${REFERENCE_LOCALE} (${namespaces.length} namespaces)\n`);
console.log("locale   namespace          manquantes  en trop");
console.log("-------  -----------------  ----------  -------");
for (const row of rows) {
  const ns = row.namespace.padEnd(19);
  const missing = String(row.missing).padStart(10);
  const extra = String(row.extra).padStart(7);
  console.log(`${row.locale.padEnd(9)}${ns}${missing}  ${extra}`);
}

if (process.argv.includes("--verbose")) {
  console.log("\nDétail :");
  for (const row of rows) {
    if (row.missingKeys?.length) {
      console.log(`\n  ${row.locale}/${row.namespace}.json — clés manquantes :`);
      for (const k of row.missingKeys) console.log(`    - ${k}`);
    }
    if (row.extraKeys?.length) {
      console.log(`\n  ${row.locale}/${row.namespace}.json — clés en trop :`);
      for (const k of row.extraKeys) console.log(`    - ${k}`);
    }
  }
}

console.log(
  `\n${hasMissing ? "✗" : "✓"} clés manquantes : ${rows.reduce((n, r) => n + r.missing, 0)}` +
    `   ${hasExtra ? "✗" : "✓"} clés en trop : ${rows.reduce((n, r) => n + r.extra, 0)}`,
);
console.log("Relance avec --verbose pour le détail par clé.");

if (hasMissing || (strict && hasExtra)) process.exit(1);

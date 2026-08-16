import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/legal/cookie-consent.tsx", import.meta.url),
  "utf8",
);

test("cookie consent has French fallbacks on public routes outside the locale provider", () => {
  assert.match(source, /import frLegal from "@\/locales\/fr\/legal\.json"/);
  assert.match(source, /translated === key/);
  assert.match(source, /frLegal\[key as keyof typeof frLegal\]/);
});

test("cookie consent mobile controls keep accessible touch targets", () => {
  assert.match(source, /min-h-11/);
  assert.match(source, /className="h-11 w-14/);
  assert.match(source, /max-h-\[calc\(100dvh-env\(safe-area-inset-bottom\)-1\.5rem\)\]/);
});

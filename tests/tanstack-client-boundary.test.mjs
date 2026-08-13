import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [startSource, viteConfig, rootRoute] = await Promise.all([
  readFile(new URL("../src/start.ts", import.meta.url), "utf8"),
  readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/__root.tsx", import.meta.url), "utf8"),
]);

test("TanStack middleware uses the public React Start entry point", () => {
  assert.match(startSource, /from ["']@tanstack\/react-start["']/);
  assert.doesNotMatch(startSource, /from ["']@tanstack\/start-client-core["']/);
});

test("Vite does not externalize TanStack's internal client core", () => {
  assert.doesNotMatch(viteConfig, /external\s*:\s*\[[^\]]*@tanstack\/start-client-core/);
});

test("the root provider keeps the router's stable QueryClient during redirects", () => {
  assert.match(rootRoute, /const \{ queryClient \} = router\.options\.context/);
  assert.doesNotMatch(rootRoute, /Route\.useRouteContext\(\)/);
});

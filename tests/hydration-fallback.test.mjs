import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

const [rootRoute, reveal, landing, styles] = await Promise.all([
  readFile(new URL("src/routes/__root.tsx", root), "utf8"),
  readFile(new URL("src/components/reveal.tsx", root), "utf8"),
  readFile(new URL("src/routes/index.tsx", root), "utf8"),
  readFile(new URL("src/styles.css", root), "utf8"),
]);

// Entrance animations server-render at opacity 0 and depend on the client to
// reveal them. A single hydration failure therefore renders a fully blank page
// with the content present but invisible — which is exactly how the
// "AsyncLocalStorage is not a constructor" crash presented. These tests guard
// the safety net that keeps such a failure readable instead of blank.

test("Reveal marks its wrapper so the fallback can target it", () => {
  assert.match(reveal, /data-reveal/);
});

test("every entrance-animated element on the landing page is marked", () => {
  // Each `initial={{ opacity: 0 ... }}` starts invisible, so each one needs the
  // marker or it stays invisible when hydration dies.
  const hiddenStarts = landing.match(/initial=\{\{ opacity: 0/g) ?? [];
  const marked = landing.match(/data-reveal=""\n\s*initial=\{\{ opacity: 0/g) ?? [];
  assert.ok(hiddenStarts.length > 0, "expected the landing page to animate content in");
  assert.equal(
    marked.length,
    hiddenStarts.length,
    `${hiddenStarts.length - marked.length} element(s) start at opacity 0 without data-reveal`,
  );
});

test("the watchdog runs inline in the shell, before hydration", () => {
  assert.match(rootRoute, /hydrationWatchdogScript/);
  assert.match(rootRoute, /data-hydration-failed/);
  // Must be inline in <head>, not an imported module: a failed bundle is
  // precisely the case it exists to catch.
  assert.match(
    rootRoute,
    /<script dangerouslySetInnerHTML=\{\{ __html: hydrationWatchdogScript \}\} \/>/,
  );
});

test("React clears the failure flag once it actually hydrates", () => {
  assert.match(rootRoute, /setAttribute\("data-hydrated"/);
  assert.match(rootRoute, /removeAttribute\("data-hydration-failed"\)/);
  assert.match(rootRoute, /useHydrationSignal\(\)/);
});

test("JS-disabled browsers get a noscript fallback", () => {
  assert.match(rootRoute, /<noscript>/);
  assert.match(rootRoute, /\[data-reveal\]\{opacity:1!important/);
});

test("the stylesheet forces marked content visible on hydration failure", () => {
  const rule = styles.match(/:root\[data-hydration-failed\] \[data-reveal\]\s*\{([^}]*)\}/);
  assert.ok(rule, "missing the [data-hydration-failed] override rule");
  // motion writes opacity/transform/filter as inline styles, so the override
  // only wins with !important.
  for (const prop of ["opacity", "filter", "transform"]) {
    assert.match(rule[1], new RegExp(`${prop}:[^;]*!important`));
  }
});

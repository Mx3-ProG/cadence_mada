import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);

const [viteConfig, rootRoute] = await Promise.all([
  readFile(new URL("vite.config.ts", root), "utf8"),
  readFile(new URL("src/routes/__root.tsx", root), "utf8"),
]);

// Regression guard for the production 500 "createCsrfMiddleware is not a
// function". When TanStack's middleware primitives are bundled into the SSR
// graph, Rollup hoists them into a shared _ssr chunk that doubles as the
// facade for @tanstack/react-start/server-entry. That chunk imports
// start-server-core, which imports the facade back while it is still
// initializing, so start-server-core's module-level createCsrfMiddleware()
// call runs against an undefined binding and every SSR request 500s.
test("Vite keeps TanStack's client core out of the SSR chunk graph", () => {
  assert.match(viteConfig, /ssr\s*:\s*\{[^}]*external\s*:\s*\[[^\]]*@tanstack\/start-client-core/s);
});

test("the root provider keeps the router's stable QueryClient during redirects", () => {
  assert.match(rootRoute, /const \{ queryClient \} = router\.options\.context/);
  assert.doesNotMatch(rootRoute, /Route\.useRouteContext\(\)/);
});

// The config assertion above encodes the fix; this one checks the artifact it
// is supposed to produce. Skipped when there is no build output to inspect.
const ssrDirs = [".output/server/_ssr", ".vercel/output/functions/__server.func/_ssr"];

async function findSsrDir() {
  for (const dir of ssrDirs) {
    const abs = path.join(root.pathname, dir);
    try {
      if ((await stat(abs)).isDirectory()) return abs;
    } catch {
      /* not built for this preset */
    }
  }
  return undefined;
}

const ssrDir = await findSsrDir();

test("the built SSR chunks contain no import cycle", { skip: !ssrDir }, async () => {
  const files = (await readdir(ssrDir)).filter((f) => f.endsWith(".mjs"));
  const graph = new Map();
  for (const file of files) {
    const source = await readFile(path.join(ssrDir, file), "utf8");
    const edges = [...source.matchAll(/from\s+"\.\/([^"]+\.mjs)"/g)].map((m) => m[1]);
    graph.set(file, edges);
  }

  const state = new Map();
  const cycles = [];
  function walk(node, trail) {
    if (state.get(node) === "done") return;
    if (state.get(node) === "open") {
      cycles.push([...trail.slice(trail.indexOf(node)), node].join(" -> "));
      return;
    }
    state.set(node, "open");
    for (const next of graph.get(node) ?? []) walk(next, [...trail, next]);
    state.set(node, "done");
  }
  for (const file of graph.keys()) walk(file, [file]);

  assert.deepEqual(cycles, [], `circular SSR chunks:\n${cycles.join("\n")}`);
});

import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Keep TanStack's middleware primitives out of the SSR chunk graph. When they
  // are bundled, Rollup hoists them into a shared _ssr chunk that also acts as
  // the facade for @tanstack/react-start/server-entry. That facade imports
  // start-server-core, which imports the facade back while it is still
  // initializing — so start-server-core's module-level createCsrfMiddleware()
  // call sees an undefined binding and every SSR request 500s with
  // "createCsrfMiddleware is not a function". See tests/tanstack-client-boundary.
  ssr: {
    external: ["@tanstack/start-client-core"],
  },
  // src/start.ts imports createCsrfMiddleware, so @tanstack/start-client-core
  // enters the client graph. Its transitive start-storage-context module runs
  // `new AsyncLocalStorage()` at module scope. The Start plugin strips that for
  // the client in a real build, but Vite's dep pre-bundler runs *before* the
  // plugin pipeline in dev, so the pre-bundled copy keeps the server branch and
  // node:async_hooks resolves to Vite's browser stub — hydration dies on
  // "AsyncLocalStorage is not a constructor" and the page stays blank.
  // Excluding it from pre-bundling routes it through the plugins instead.
  optimizeDeps: {
    exclude: ["@tanstack/start-client-core"],
  },
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    // tanstackStart() must come before nitro() and viteReact()
    tanstackStart({
      server: { entry: "server" },
    }),
    // Generates the platform-specific server output (auto-detects Vercel via
    // process.env.VERCEL at build time — required for the app to run there).
    nitro(),
    viteReact(),
  ],
});

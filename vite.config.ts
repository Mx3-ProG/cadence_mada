import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Keep TanStack's middleware primitives outside the SSR bundle. Bundling
  // them creates a circular chunk on Vercel where createCsrfMiddleware can be
  // read before it is initialized during a cold start.
  ssr: {
    external: ["@tanstack/start-client-core"],
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

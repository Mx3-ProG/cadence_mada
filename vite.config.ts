import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
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

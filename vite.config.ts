import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Paper, light: the manifest has no dark variant (SPEC.md §5.4).
const PAPER = "#FBEBDD";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // The shell is precached by our own service worker (src/sw/sw.ts), which also syncs the outbox in the
    // background (SPEC.md §5.4). An update waits for "Nuova versione disponibile" to be accepted.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src/sw",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png,webmanifest}"],
        rollupFormat: "iife",
      },
      manifest: {
        id: "/v/",
        name: "Quits",
        short_name: "Quits",
        description: "Chi ha pagato cosa in vacanza, e come tornare pari.",
        lang: "it",
        // No fragment: the installed app starts without a token and finds its trip locally (SPEC.md §5.5).
        start_url: "/v/?source=pwa",
        scope: "/",
        display: "standalone",
        background_color: PAPER,
        theme_color: PAPER,
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});

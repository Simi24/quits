import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // The shell is precached so the app loads offline (SPEC.md §5.4). Fonts are part of it.
    // The update prompt, manifest and icons come with S8.
    VitePWA({
      registerType: "prompt",
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
});

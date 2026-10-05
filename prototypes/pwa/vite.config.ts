import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// PROTOTYPE (issue #11). The fragment (#<token>) is never part of start_url:
// the installed app opens /v/?source=pwa and finds its trip in IndexedDB,
// else in the first-party cookie mirror (see src/boot.ts).
export default defineConfig({
  plugins: [
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/v/',
        name: 'Quits (prototipo)',
        short_name: 'Quits proto',
        description: 'Prototipo usa e getta: sopravvivenza di link, identità e coda offline all’installazione.',
        lang: 'it',
        start_url: '/v/?source=pwa',
        scope: '/',
        display: 'standalone',
        background_color: '#1e293b',
        theme_color: '#1e293b',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        importScripts: ['sw-sync.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});

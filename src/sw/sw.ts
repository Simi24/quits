/// <reference lib="webworker" />
import { tripIdsWithPending } from "../db";
import { openTabChannel, syncPendingTrips, syncTrip, OUTBOX_TAG } from "../sync";
import { api, store } from "../sync/client";
import { cacheNameFor, isShellCache, precacheUrls } from "./precache";
import type { PrecacheEntry } from "./precache";

/** The `sync` event is not in TypeScript's WebWorker library yet. */
interface SyncEvent extends ExtendableEvent {
  tag: string;
}

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: PrecacheEntry[] };

/** The app shell, so the app loads offline after the first visit, fonts included (SPEC.md §5.4). */
const shell = self.__WB_MANIFEST;
const CACHE = cacheNameFor(shell);
const INDEX = "/";

self.addEventListener("install", (event) => {
  // No skipWaiting here: an update waits until the person accepts "Nuova versione disponibile".
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(precacheUrls(shell))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (isShellCache(name) && name !== CACHE) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if ((event.data as { type?: string } | null)?.type === "SKIP_WAITING") void self.skipWaiting();
});

// Navigations are answered with the shell (the app routes itself); built files come from the cache. The API
// is never touched: it needs the network, and its answers say so (SPEC.md §6.4). Cross-origin requests, the
// Web Analytics beacon among them, are never answered or cached (SPEC.md §10.1).
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(request.mode === "navigate" ? INDEX : request, { ignoreSearch: request.mode !== "navigate" });
      return hit ?? fetch(request);
    }),
  );
});

// Background Sync (Chromium): the browser wakes the worker when the network is back, even with the app closed.
// The token is read from IndexedDB, never from a cookie, and goes in `Authorization` (SPEC.md §5.4).
self.addEventListener("sync", (raw) => {
  const event = raw as SyncEvent;
  if (event.tag !== OUTBOX_TAG) return;
  const channel = openTabChannel(() => undefined);
  event.waitUntil(
    syncPendingTrips({
      pendingTripIds: tripIdsWithPending,
      syncOne: (tripId) => syncTrip({ tripId, store, api }),
      announce: channel.announce,
    }).finally(channel.close),
  );
});

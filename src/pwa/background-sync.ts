import { registerOutboxSync } from "../sync";

type WithSync = Parameters<typeof registerOutboxSync>[0];

/** After a local change: where Background Sync exists, have the browser wake the service worker when the network is back (SPEC.md §5.4). */
export function requestBackgroundSync(): void {
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.ready.then((registration) => registerOutboxSync(registration as WithSync)).catch(() => false);
}

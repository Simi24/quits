import { registerSW } from "virtual:pwa-register";
import { offerUpdate } from "./update-store";

/** Registers the service worker; a build that arrives later is offered as "Nuova versione disponibile" (SPEC.md §5.4). */
export function registerServiceWorker(): void {
  const update = registerSW({ onNeedRefresh: () => offerUpdate(() => void update(true)) });
}

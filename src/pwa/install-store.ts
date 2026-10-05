import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

// Registered when the module loads: the browser can fire this before the first screen is drawn.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  emit();
});
window.addEventListener("appinstalled", () => {
  deferred = null;
  emit();
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** The browser handed over its install prompt (Chromium). */
export const useCanPrompt = (): boolean => useSyncExternalStore(subscribe, () => deferred !== null);

/** The browser's own install dialog. A prompt can be used once. */
export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (!event) return;
  deferred = null;
  emit();
  await event.prompt();
}

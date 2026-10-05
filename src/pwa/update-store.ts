import { useSyncExternalStore } from "react";

let waiting = false;
let apply: () => void = () => undefined;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

/** Set by the registration: a new build is installed and waits for the person to accept it. */
export const offerUpdate = (accept: () => void): void => {
  waiting = true;
  apply = accept;
  emit();
};

/** Takes the new version: the waiting worker takes over and the page reloads. */
export const acceptUpdate = (): void => apply();

export const dismissUpdate = (): void => {
  waiting = false;
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export const useUpdateWaiting = (): boolean => useSyncExternalStore(subscribe, () => waiting);

type Listener = () => void;

const listeners = new Set<Listener>();

/** Called when something the cookie bridge mirrors changed: a trip adopted, its use, who this device is in it. */
export const onTripsChanged = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export const notifyTripsChanged = (): void => {
  for (const listener of listeners) listener();
};

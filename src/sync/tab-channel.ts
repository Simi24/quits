const NAME = "quits-changes";

/**
 * Tabs of one browser tell each other when a trip changed in IndexedDB, so two tabs on the same trip
 * refresh each other at once instead of waiting for the next poll.
 */
export function openTabChannel(onChange: (tripId: string) => void): { announce: (tripId: string) => void; close: () => void } {
  if (typeof BroadcastChannel === "undefined") return { announce: () => undefined, close: () => undefined };
  const channel = new BroadcastChannel(NAME);
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (typeof event.data === "string") onChange(event.data);
  };
  return { announce: (tripId) => channel.postMessage(tripId), close: () => channel.close() };
}

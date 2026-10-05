import type { Bridge, BridgeEntry } from "./cookie-bridge";

export interface BootInput {
  /** What follows `#` in the address bar on a trip link; empty when there is none. */
  fragmentToken: string;
  /** Started from the installed app's `start_url` (`/v/?source=pwa`). */
  fromApp: boolean;
  /** Trips already in IndexedDB, most recently used first. */
  storedTripIds: string[];
  lastTripId: string | null;
  bridge: Bridge | null;
}

export type BootOpen = { kind: "link"; token: string } | { kind: "trip"; tripId: string } | { kind: "landing" };

export interface BootPlan {
  open: BootOpen;
  /** Trips to write into IndexedDB from the bridge, most recent first. Only when IndexedDB has none. */
  restore: BridgeEntry[];
  /** The device id to take from the bridge, with the restore. */
  deviceId: string | null;
}

/**
 * How a start finds its trip (SPEC.md §5.5): link fragment, then IndexedDB, then the cookie bridge.
 * The bridge only fills an empty IndexedDB: it is a copy for iOS, never a second source of truth.
 */
export function planBoot({ fragmentToken, fromApp, storedTripIds, lastTripId, bridge }: BootInput): BootPlan {
  const restoring = storedTripIds.length === 0 && bridge !== null;
  const restore = restoring ? bridge.trips : [];
  const deviceId = restoring ? bridge.deviceId : null;

  if (fragmentToken) return { open: { kind: "link", token: fragmentToken }, restore, deviceId };

  const [mostRecent] = storedTripIds.length > 0 ? storedTripIds : restore.map((entry) => entry.tripId);
  if (!mostRecent) return { open: { kind: "landing" }, restore, deviceId };
  if (restoring || fromApp) return { open: { kind: "trip", tripId: mostRecent }, restore, deviceId };
  const last = lastTripId !== null && storedTripIds.includes(lastTripId) ? lastTripId : null;
  return { open: last ? { kind: "trip", tripId: last } : { kind: "landing" }, restore, deviceId };
}

import { listTrips, readDevice, restoreFromBridge } from "../db";
import type { DeviceRecord, TripSummary } from "../db";
import { api, store } from "../sync/client";
import { syncTrip } from "../sync";
import { tokenInAddressBar } from "../trip";
import { readBridgeCookie } from "./cookie";
import { planBoot } from "./plan-boot";
import type { BootOpen } from "./plan-boot";

export interface Booted {
  device: DeviceRecord;
  trips: TripSummary[];
  open: BootOpen;
}

/** A restored trip has no log yet: the first sync brings it, but a start never waits on a slow network for long. */
const RESTORE_SYNC_MS = 4000;

/** The installed app starts at the manifest's `start_url`, `/v/?source=pwa` (SPEC.md §5.5). */
const startedFromApp = (): boolean => new URLSearchParams(window.location.search).get("source") === "pwa";

/** Reads IndexedDB, restores it from the cookie bridge when it is empty, and decides what to open (SPEC.md §5.5). */
export async function bootApp(): Promise<Booted> {
  const stored = await listTrips();
  const device = await readDevice();
  const plan = planBoot({
    fragmentToken: tokenInAddressBar(),
    fromApp: startedFromApp(),
    storedTripIds: stored.map((s) => s.tripId),
    lastTripId: device.lastTripId,
    bridge: readBridgeCookie(),
  });
  if (plan.deviceId === null) return { device, trips: stored, open: plan.open };

  await restoreFromBridge(plan.deviceId, plan.restore);
  await Promise.race([
    Promise.allSettled(plan.restore.map(({ tripId }) => syncTrip({ tripId, store, api }))),
    new Promise((resolve) => setTimeout(resolve, RESTORE_SYNC_MS)),
  ]);
  return { device: await readDevice(), trips: await listTrips(), open: plan.open };
}

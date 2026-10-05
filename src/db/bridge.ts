import { bridgeFrom } from "../boot/bridge-from";
import type { Bridge, BridgeEntry } from "../boot/cookie-bridge";
import { freshDevice as fresh, readDevice } from "./device";
import { openQuitsDb } from "./open";
import type { DeviceRecord, TripMeta } from "./schema";

/** The bridge as IndexedDB says it should be right now. */
export async function snapshotBridge(): Promise<Bridge> {
  const [device, db] = await Promise.all([readDevice(), openQuitsDb()]);
  return bridgeFrom(device.deviceId, await db.getAll("trips"));
}

/**
 * Writes what the bridge carries into an empty IndexedDB: the device id and every trip with its link and
 * who this device was in it. The log of each trip comes back from the server on its first sync (SPEC.md §5.5).
 */
export async function restoreFromBridge(deviceId: string, entries: BridgeEntry[]): Promise<void> {
  const db = await openQuitsDb();
  const tx = db.transaction(["device", "trips"], "readwrite");
  const stored = await tx.objectStore("device").get("device");
  const device: DeviceRecord = { ...fresh(deviceId), ...stored, deviceId };
  await tx.objectStore("device").put(device);
  // The bridge lists the most recent first; the oldest gets the oldest stamp so the order survives.
  const now = Date.now();
  for (const [i, { tripId, token, participantId }] of entries.entries()) {
    if (await tx.objectStore("trips").get(tripId)) continue;
    const meta: TripMeta = {
      tripId,
      token,
      meId: participantId,
      nextOutbox: 0,
      lastUsedAt: new Date(now - i).toISOString(),
      lastSeq: 0,
      access: "ok",
      deletion: null,
      seenConflicts: [],
    };
    await tx.objectStore("trips").put(meta);
  }
  await tx.done;
}

import { openQuitsDb } from "./open";
import type { DeviceRecord } from "./schema";

export const freshDevice = (deviceId: string = crypto.randomUUID()): DeviceRecord => ({ key: "device", deviceId, lang: null, theme: "system", lastTripId: null, creatorCode: null, installDismissed: false, installHintShown: false });

/** The device record, created on first use with its anonymous device id. */
export async function readDevice(): Promise<DeviceRecord> {
  const db = await openQuitsDb();
  const tx = db.transaction("device", "readwrite");
  const stored = await tx.store.get("device");
  // A record written before the creator code existed (version 1) has no such field.
  const device = stored ? { ...freshDevice(), ...stored } : freshDevice();
  if (!stored) await tx.store.put(device);
  await tx.done;
  return device;
}

/** Read and write in one transaction, so two quick changes (language, then theme) never overwrite each other. */
export async function updateDevice(changes: Partial<Omit<DeviceRecord, "key" | "deviceId">>): Promise<DeviceRecord> {
  const db = await openQuitsDb();
  const tx = db.transaction("device", "readwrite");
  const next = { ...((await tx.store.get("device")) ?? freshDevice()), ...changes };
  await tx.store.put(next);
  await tx.done;
  return next;
}

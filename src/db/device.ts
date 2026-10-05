import { openQuitsDb } from "./open";
import type { DeviceRecord } from "./schema";

const fresh = (): DeviceRecord => ({ key: "device", deviceId: crypto.randomUUID(), lang: null, theme: "system", lastTripId: null, creatorCode: null, tipSeen: false });

/** The device record, created on first use with its anonymous device id. */
export async function readDevice(): Promise<DeviceRecord> {
  const db = await openQuitsDb();
  const tx = db.transaction("device", "readwrite");
  const stored = await tx.store.get("device");
  // A record written before a field existed (the creator code, the tip) lacks it: the defaults fill it in.
  const device = stored ? { ...fresh(), ...stored } : fresh();
  if (!stored) await tx.store.put(device);
  await tx.done;
  return device;
}

/** Read and write in one transaction, so two quick changes (language, then theme) never overwrite each other. */
export async function updateDevice(changes: Partial<Omit<DeviceRecord, "key" | "deviceId">>): Promise<DeviceRecord> {
  const db = await openQuitsDb();
  const tx = db.transaction("device", "readwrite");
  const next = { ...((await tx.store.get("device")) ?? fresh()), ...changes };
  await tx.store.put(next);
  await tx.done;
  return next;
}

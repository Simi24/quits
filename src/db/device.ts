import { openQuitsDb } from "./open";
import type { DeviceRecord } from "./schema";

/** The device record, created on first use with its anonymous device id. */
export async function readDevice(): Promise<DeviceRecord> {
  const db = await openQuitsDb();
  const stored = await db.get("device", "device");
  if (stored) return stored;
  const fresh: DeviceRecord = { key: "device", deviceId: crypto.randomUUID(), lang: null, theme: "system", lastTripId: null };
  await db.put("device", fresh);
  return fresh;
}

export async function updateDevice(changes: Partial<Omit<DeviceRecord, "key" | "deviceId">>): Promise<DeviceRecord> {
  const db = await openQuitsDb();
  const next = { ...(await readDevice()), ...changes };
  await db.put("device", next);
  return next;
}

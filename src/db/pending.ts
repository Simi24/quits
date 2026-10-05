import { openQuitsDb } from "./open";

/** The trips that have changes waiting to be sent: what a Background Sync wake-up has to work on. */
export async function tripIdsWithPending(): Promise<string[]> {
  const db = await openQuitsDb();
  const keys = await db.getAllKeysFromIndex("outbox", "byTrip");
  return [...new Set(keys.map(([tripId]) => tripId))];
}

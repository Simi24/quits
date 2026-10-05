import { foldWithPending, parseOperation } from "../../domain";
import type { Operation, Trip } from "../../domain";
import { openQuitsDb } from "./open";
import type { OutboxEntry, TripMeta } from "./schema";

export interface StoredTrip {
  meta: TripMeta;
  operations: Operation[];
}

/** Every operation is checked against the shared schema before it is stored: an invalid write never reaches the log. */
function assertValid(operation: Operation) {
  const parsed = parseOperation(operation);
  if (!parsed.ok) throw new Error(`Refusing to store an invalid operation: ${parsed.detail}`);
}

/** The operations of one trip, in the order they were written. */
export async function loadTrip(tripId: string): Promise<StoredTrip | undefined> {
  const db = await openQuitsDb();
  const meta = await db.get("trips", tripId);
  if (!meta) return undefined;
  const entries = await db.getAllFromIndex("outbox", "byTrip", tripId);
  return { meta, operations: entries.sort((a, b) => a.n - b.n).map((e) => e.operation) };
}

/** Starts a trip from its first operation (SPEC.md S2: created locally for now; server creation is S4). */
export async function createTrip(tripId: string, creation: Operation): Promise<void> {
  assertValid(creation);
  const db = await openQuitsDb();
  const tx = db.transaction(["trips", "outbox"], "readwrite");
  const meta: TripMeta = { tripId, meId: creation.by, nextOutbox: 1, lastUsedAt: new Date().toISOString() };
  await tx.objectStore("trips").put(meta);
  await tx.objectStore("outbox").put({ tripId, n: 0, operation: creation });
  await tx.done;
}

/** Appends one operation to the outbox of its trip, in one transaction with the counter. */
export async function appendOperation(tripId: string, operation: Operation): Promise<void> {
  assertValid(operation);
  const db = await openQuitsDb();
  const tx = db.transaction(["trips", "outbox"], "readwrite");
  const meta = await tx.objectStore("trips").get(tripId);
  if (!meta) throw new Error("Unknown trip");
  const entry: OutboxEntry = { tripId, n: meta.nextOutbox, operation };
  await tx.objectStore("outbox").put(entry);
  await tx.objectStore("trips").put({ ...meta, nextOutbox: meta.nextOutbox + 1, lastUsedAt: new Date().toISOString() });
  await tx.done;
}

export async function setMe(tripId: string, meId: string): Promise<void> {
  const db = await openQuitsDb();
  const meta = await db.get("trips", tripId);
  if (meta) await db.put("trips", { ...meta, meId });
}

export interface TripSummary {
  tripId: string;
  trip: Trip;
  lastUsedAt: string;
}

/** The trips on this device, most recently used first. */
export async function listTrips(): Promise<TripSummary[]> {
  const db = await openQuitsDb();
  const metas = await db.getAll("trips");
  const summaries = await Promise.all(
    metas.map(async (meta) => {
      const entries = await db.getAllFromIndex("outbox", "byTrip", meta.tripId);
      const operations = entries.sort((a, b) => a.n - b.n).map((e) => e.operation);
      return { tripId: meta.tripId, trip: foldWithPending([], operations), lastUsedAt: meta.lastUsedAt };
    }),
  );
  return summaries.sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1));
}

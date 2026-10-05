import { foldWithPending, parseOperation, upcastOperation } from "../../domain";
import type { Operation, SequencedOperation, Trip } from "../../domain";
import type { RejectedItem } from "../sync/types";
import { notifyTripsChanged } from "./changes";
import { openQuitsDb } from "./open";
import type { OutboxEntry, TripMeta } from "./schema";

export interface StoredTrip {
  meta: TripMeta;
  /** The server's log, in sequence order. */
  confirmed: SequencedOperation[];
  /** Made on this device and not yet confirmed, in the order written. */
  pending: Operation[];
  rejected: RejectedItem[];
}

/** Every operation is checked against the shared schema before it is stored: an invalid write never reaches the log. */
function assertValid(operation: Operation) {
  const parsed = parseOperation(operation);
  if (!parsed.ok) throw new Error(`Refusing to store an invalid operation: ${parsed.detail}`);
}

/** The log of one trip: what the server confirmed, and what this device still has to send. */
export async function loadTrip(tripId: string): Promise<StoredTrip | undefined> {
  const db = await openQuitsDb();
  const tx = db.transaction(["trips", "outbox", "confirmed", "rejected"]);
  const meta = await tx.objectStore("trips").get(tripId);
  if (!meta) return undefined;
  const [outbox, confirmed, rejected] = await Promise.all([
    tx.objectStore("outbox").index("byTrip").getAll(tripId),
    tx.objectStore("confirmed").index("byTrip").getAll(tripId),
    tx.objectStore("rejected").index("byTrip").getAll(tripId),
  ]);
  return {
    meta,
    confirmed: confirmed.sort((a, b) => a.seq - b.seq).map(({ seq, operation }) => ({ seq, operation })),
    pending: outbox.sort((a, b) => a.n - b.n).map((e) => e.operation),
    rejected: rejected.map(({ operation, reason, detail }) => ({ operation, reason, detail })),
  };
}

/** Rebase: the confirmed log with the device's own pending operations folded on top (SPEC.md §5.1). */
export const foldStored = (stored: Pick<StoredTrip, "confirmed" | "pending">): Trip => foldWithPending(stored.confirmed, stored.pending);

/**
 * The trip's log as this device has it, in the current shape: the server's operations by sequence, then
 * the ones still waiting that the server has not confirmed. What an export carries and a merge summary reads.
 */
export const logOperations = ({ confirmed, pending }: Pick<StoredTrip, "confirmed" | "pending">): Operation[] => {
  const known = new Set(confirmed.map((c) => c.operation.id));
  return [...confirmed.map((c) => c.operation), ...pending.filter((o) => !known.has(o.id))].map(upcastOperation);
};

const newMeta = (tripId: string, token: string | null, meId: string | null): TripMeta => ({
  tripId,
  token,
  meId,
  nextOutbox: 0,
  lastUsedAt: new Date().toISOString(),
  lastSeq: 0,
  access: "ok",
  deletion: null,
  seenConflicts: [],
});

/**
 * Starts a trip on this device, or swaps in the new token of one it already has (SPEC.md §5.2). `meId` is
 * set only by the device that creates the trip: everyone else is asked "chi sei?".
 */
export async function adoptTrip(tripId: string, token: string, meId: string | null = null): Promise<void> {
  const db = await openQuitsDb();
  const tx = db.transaction("trips", "readwrite");
  const existing = await tx.store.get(tripId);
  await tx.store.put(existing ? { ...existing, token, access: "ok", deletion: null } : newMeta(tripId, token, meId));
  await tx.done;
  notifyTripsChanged();
}

/**
 * Appends operations to the outbox of their trip, in order, in one transaction with the counter:
 * all of them are stored or none is (a settle-all never lands half-way).
 */
export async function appendOperations(tripId: string, operations: Operation[]): Promise<void> {
  operations.forEach(assertValid);
  const db = await openQuitsDb();
  const tx = db.transaction(["trips", "outbox"], "readwrite");
  const meta = await tx.objectStore("trips").get(tripId);
  if (!meta) throw new Error("Unknown trip");
  for (const [i, operation] of operations.entries()) {
    const entry: OutboxEntry = { tripId, n: meta.nextOutbox + i, operation };
    await tx.objectStore("outbox").put(entry);
  }
  await tx.objectStore("trips").put({ ...meta, nextOutbox: meta.nextOutbox + operations.length, lastUsedAt: new Date().toISOString() });
  await tx.done;
  notifyTripsChanged();
}

/** Read and write in one transaction, like every change to the trip record: a stale copy must never be put back. */
async function updateMeta(tripId: string, change: (meta: TripMeta) => TripMeta): Promise<void> {
  const db = await openQuitsDb();
  const tx = db.transaction("trips", "readwrite");
  const meta = await tx.store.get(tripId);
  if (meta) await tx.store.put(change(meta));
  await tx.done;
  notifyTripsChanged();
}

/** Opening a trip makes it the most recently used one, which is the one the installed app opens (SPEC.md §5.5). */
export const markTripUsed = (tripId: string) => updateMeta(tripId, (meta) => ({ ...meta, lastUsedAt: new Date().toISOString() }));

/** Remembers who this device is in the trip. */
export const setMe = (tripId: string, meId: string) => updateMeta(tripId, (meta) => ({ ...meta, meId }));

/** Remembers that a conflict was seen, so its icon and notice go away on this device. */
export const dismissConflict = (tripId: string, winnerOpId: string) =>
  updateMeta(tripId, (meta) => ({ ...meta, seenConflicts: [...new Set([...meta.seenConflicts, winnerOpId])] }));

export interface TripSummary {
  tripId: string;
  trip: Trip;
  meta: TripMeta;
}

/** The trips on this device, most recently used first. */
export async function listTrips(): Promise<TripSummary[]> {
  const db = await openQuitsDb();
  const metas = await db.getAll("trips");
  const summaries = await Promise.all(
    metas.map(async (meta) => {
      const stored = await loadTrip(meta.tripId);
      return stored ? { tripId: meta.tripId, trip: foldStored(stored), meta: stored.meta } : undefined;
    }),
  );
  return summaries.filter((s): s is TripSummary => s !== undefined).sort((a, b) => (a.meta.lastUsedAt < b.meta.lastUsedAt ? 1 : -1));
}

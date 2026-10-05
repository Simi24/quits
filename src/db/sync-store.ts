import type { LinkStore } from "../sync/types";
import { openQuitsDb } from "./open";
import { adoptTrip } from "./trips";

/** The sync engine's store, on IndexedDB. Each method is one transaction, so a crash half-way loses nothing. */
export const idbSyncStore: LinkStore = {
  async readSyncState(tripId) {
    const db = await openQuitsDb();
    const meta = await db.get("trips", tripId);
    if (!meta) return undefined;
    const entries = await db.getAllFromIndex("outbox", "byTrip", tripId);
    return {
      token: meta.token,
      lastSeq: meta.lastSeq,
      access: meta.access,
      outbox: entries.sort((a, b) => a.n - b.n).map(({ n, operation }) => ({ n, operation })),
    };
  },

  async applyPush(tripId, settled) {
    const db = await openQuitsDb();
    const tx = db.transaction(["outbox", "confirmed", "rejected"], "readwrite");
    for (const entry of settled) {
      await tx.objectStore("outbox").delete([tripId, entry.item.n]);
      if (entry.status === "confirmed") {
        await tx.objectStore("confirmed").put({ tripId, seq: entry.seq, operation: entry.item.operation });
      } else {
        const { operation } = entry.item;
        await tx.objectStore("rejected").put({ tripId, id: operation.id, operation, reason: entry.reason, detail: entry.detail });
      }
    }
    await tx.done;
  },

  async applyPull(tripId, operations, lastSeq) {
    const db = await openQuitsDb();
    const tx = db.transaction(["trips", "confirmed"], "readwrite");
    for (const { seq, operation } of operations) await tx.objectStore("confirmed").put({ tripId, seq, operation });
    const meta = await tx.objectStore("trips").get(tripId);
    if (meta && lastSeq > meta.lastSeq) await tx.objectStore("trips").put({ ...meta, lastSeq });
    await tx.done;
  },

  async setAccess(tripId, token, access, deletion) {
    const db = await openQuitsDb();
    const tx = db.transaction("trips", "readwrite");
    const meta = await tx.store.get(tripId);
    if (meta && meta.token === token) await tx.store.put({ ...meta, access, deletion });
    await tx.done;
  },

  async findByToken(token) {
    const db = await openQuitsDb();
    return (await db.getFromIndex("trips", "byToken", token))?.tripId;
  },

  async hasTrip(tripId) {
    const db = await openQuitsDb();
    return (await db.getKey("trips", tripId)) !== undefined;
  },

  adoptTrip: (tripId, token, meId) => adoptTrip(tripId, token, meId ?? null),
};

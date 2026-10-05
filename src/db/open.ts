import { openDB } from "idb";
import type { IDBPDatabase } from "idb";
import type { QuitsDb, TripMeta } from "./schema";

let opened: Promise<IDBPDatabase<QuitsDb>> | undefined;

/** What a trip made before sync existed (version 1) gets: it has no link, so it stays on this device. */
const syncDefaults = { token: null, lastSeq: 0, access: "ok", deletion: null } as const;

/** The one local database. Trips are keyed by `tripId`, so opening a second trip never touches the first (SPEC.md §5.2). */
export const openQuitsDb = (): Promise<IDBPDatabase<QuitsDb>> => {
  opened ??= openDB<QuitsDb>("quits", 2, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        db.createObjectStore("trips", { keyPath: "tripId" });
        db.createObjectStore("outbox", { keyPath: ["tripId", "n"] }).createIndex("byTrip", "tripId");
        db.createObjectStore("device", { keyPath: "key" });
      }
      if (oldVersion < 2) {
        db.createObjectStore("confirmed", { keyPath: ["tripId", "seq"] }).createIndex("byTrip", "tripId");
        db.createObjectStore("rejected", { keyPath: ["tripId", "id"] }).createIndex("byTrip", "tripId");
        const trips = tx.objectStore("trips");
        trips.createIndex("byToken", "token");
        for (let cursor = await trips.openCursor(); cursor; cursor = await cursor.continue()) {
          await cursor.update({ ...syncDefaults, ...cursor.value, seenConflicts: [] } as TripMeta);
        }
      }
    },
    // A newer build wants to upgrade: let it, or its start would hang behind this tab or the service worker.
    // The next call here opens again.
    blocking() {
      void opened?.then((db) => db.close());
      opened = undefined;
    },
    // The browser closed the connection (storage cleared, a crash): the next call opens a new one.
    terminated() {
      opened = undefined;
    },
  });
  return opened;
};

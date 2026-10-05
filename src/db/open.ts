import { openDB } from "idb";
import type { IDBPDatabase } from "idb";
import type { QuitsDb } from "./schema";

let opened: Promise<IDBPDatabase<QuitsDb>> | undefined;

/** The one local database. Trips are keyed by `tripId`, so opening a second trip never touches the first (SPEC.md §5.2). */
export const openQuitsDb = (): Promise<IDBPDatabase<QuitsDb>> => {
  opened ??= openDB<QuitsDb>("quits", 1, {
    upgrade(db) {
      db.createObjectStore("trips", { keyPath: "tripId" });
      db.createObjectStore("outbox", { keyPath: ["tripId", "n"] }).createIndex("byTrip", "tripId");
      db.createObjectStore("device", { keyPath: "key" });
    },
  });
  return opened;
};

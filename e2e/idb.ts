import type { Page } from "@playwright/test";

/** Everything in one object store of the app's IndexedDB, so a test can see what a device really holds. */
export const readStore = <T>(page: Page, store: string): Promise<T[]> =>
  page.evaluate(
    (name) =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open("quits");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const all = open.result.transaction(name).objectStore(name).getAll();
          all.onsuccess = () => resolve(all.result);
          all.onerror = () => reject(all.error);
        };
      }),
    store,
  ) as Promise<T[]>;

export interface StoredTripMeta {
  tripId: string;
  token: string | null;
  meId: string | null;
}

export const tripMetas = (page: Page) => readStore<StoredTripMeta>(page, "trips");
export const outboxOf = async (page: Page, tripId: string) => (await readStore<{ tripId: string }>(page, "outbox")).filter((e) => e.tripId === tripId);
export const deviceId = async (page: Page) => (await readStore<{ deviceId: string }>(page, "device"))[0]?.deviceId;

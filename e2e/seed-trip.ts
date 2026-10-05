import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { Operation } from "../domain/index.ts";
import { sardegnaOperations } from "../domain/sardegna.fixture.ts";
import { expense, expenseCreated, tripCreated } from "../domain/testing.ts";

/** Writes a whole trip into the device's IndexedDB as an outbox, then opens it from the landing. No network, no UI to click through. */
export async function seedTrip(page: Page, name: string, operations: Operation[]): Promise<string> {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
  const tripId = `seed-${Math.random().toString(36).slice(2, 8)}`;
  await page.evaluate(
    ([id, ops]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("quits");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(["trips", "outbox"], "readwrite");
          // A trip with no link: it lives on this device only and never syncs (SPEC.md G-B3).
          tx.objectStore("trips").put({
            tripId: id,
            token: null,
            meId: "p1",
            nextOutbox: ops.length,
            lastUsedAt: new Date().toISOString(),
            lastSeq: 0,
            access: "ok",
            deletion: null,
            seenConflicts: [],
          });
          ops.forEach((operation, n) => tx.objectStore("outbox").put({ tripId: id, n, operation }));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    [tripId, operations] as const,
  );
  await page.goto("/");
  await page.getByRole("button", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return tripId;
}

/** Puts an operation in the `rejected` store, as if the server had refused it: the history shows it as "non inviata". */
export const seedRejected = (page: Page, tripId: string, operation: Operation, reason: string, detail: string) =>
  page.evaluate(
    ([id, rejected, why, more]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("quits");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction("rejected", "readwrite");
          tx.objectStore("rejected").put({ tripId: id, id: (rejected as { id: string }).id, operation: rejected, reason: why, detail: more });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    [tripId, operation, reason, detail] as const,
  );

export const sardegna = () => sardegnaOperations();

/** A dated trip with a booking made before the start and one dinner on the first day. */
export const tripWithBooking = (): Operation[] => [
  tripCreated({ name: "Estate", from: "2026-07-01", to: "2026-07-03" }, { id: "created" }),
  expenseCreated("booking", expense({ description: "Caparra", date: "2026-05-20", amount: 50000, categoryId: "accommodation", payers: [{ participantId: "p1", amount: 50000 }] })),
  expenseCreated("dinner", expense({ description: "Cena", date: "2026-07-01", amount: 3000, payers: [{ participantId: "p1", amount: 3000 }] })),
];

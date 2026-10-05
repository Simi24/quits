import { describe, expect, it } from "vitest";
import { OUTBOX_TAG, registerOutboxSync, syncPendingTrips } from "./background-sync";
import type { SyncOutcome } from "./sync-trip";

const synced = (pushed = 1): SyncOutcome => ({ status: "synced", pushed, rejected: 0, pulled: 0 });

const run = (outcomes: Record<string, SyncOutcome>, pending = Object.keys(outcomes)) => {
  const announced: string[] = [];
  const attempted: string[] = [];
  const promise = syncPendingTrips({
    pendingTripIds: async () => pending,
    syncOne: async (tripId) => {
      attempted.push(tripId);
      return outcomes[tripId] ?? synced();
    },
    announce: (tripId) => announced.push(tripId),
  });
  return { promise, announced, attempted };
};

describe("syncPendingTrips, what the service worker does when the browser wakes it", () => {
  it("syncs every trip that has changes waiting and tells the open pages", async () => {
    const { promise, announced, attempted } = run({ a: synced(), b: synced(2) });
    await promise;
    expect(attempted).toEqual(["a", "b"]);
    expect(announced).toEqual(["a", "b"]);
  });

  it("does nothing when no trip has anything waiting", async () => {
    const { promise, attempted } = run({}, []);
    await promise;
    expect(attempted).toEqual([]);
  });

  it("fails when a trip could not be reached, so the browser wakes the worker again, after trying the others", async () => {
    const { promise, attempted, announced } = run({ a: { status: "offline" }, b: synced() });
    await expect(promise).rejects.toThrow();
    expect(attempted).toEqual(["a", "b"]);
    expect(announced).toEqual(["b"]);
  });

  it("fails on a server error too, which may pass", async () => {
    await expect(run({ a: { status: "error", httpStatus: 503 } }).promise).rejects.toThrow();
  });

  it.each([
    ["a changed link", { status: "link_changed" }],
    ["a deleted trip", { status: "deleted", deletion: { deletedBy: "p", deletedAt: "x", restoreUntil: "y" } }],
    ["a trip with no link", { status: "local" }],
  ] as [string, SyncOutcome][])("does not ask for another wake-up because of %s: retrying cannot change the answer", async (_label, outcome) => {
    await expect(run({ a: outcome }).promise).resolves.toBeUndefined();
  });
});

describe("registerOutboxSync, what the page asks of the browser after a change", () => {
  it("registers the outbox tag where Background Sync exists", async () => {
    const tags: string[] = [];
    const registered = await registerOutboxSync({ sync: { register: async (tag: string) => void tags.push(tag) } });
    expect(registered).toBe(true);
    expect(tags).toEqual([OUTBOX_TAG]);
  });

  it("does nothing, and says so, where it does not exist", async () => {
    expect(await registerOutboxSync({})).toBe(false);
  });

  it("never fails the change that asked for it", async () => {
    const registered = await registerOutboxSync({
      sync: {
        register: async () => {
          throw new Error("disabled");
        },
      },
    });
    expect(registered).toBe(false);
  });
});

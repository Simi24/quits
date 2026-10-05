import { parseOperation } from "../../domain";
import type { SequencedOperation } from "../../domain";
import type { Api, ApiFailure, Deletion, OutboxItem, Settled, SyncStore } from "./types";

/** The server takes at most 100 operations per push (SPEC.md G-B1). */
export const PUSH_CHUNK = 100;

export type SyncOutcome =
  | { status: "synced"; pushed: number; rejected: number; pulled: number }
  | { status: "offline" | "link_changed" | "unavailable" | "local" }
  | { status: "deleted"; deletion: Deletion }
  | { status: "error"; httpStatus: number };

interface SyncDeps {
  tripId: string;
  store: SyncStore;
  api: Api;
}

/** Turns an API failure into what the device must remember, and what the caller is told. */
async function settleFailure(failure: ApiFailure, { tripId, store }: SyncDeps): Promise<SyncOutcome> {
  switch (failure.kind) {
    case "link_changed":
      await store.setAccess(tripId, "link_changed", null);
      return { status: "link_changed" };
    case "deleted":
      await store.setAccess(tripId, "deleted", failure.deletion);
      return { status: "deleted", deletion: failure.deletion };
    case "unavailable":
      await store.setAccess(tripId, "unavailable", null);
      return { status: "unavailable" };
    case "offline":
      return { status: "offline" };
    case "forbidden":
      return { status: "error", httpStatus: 403 };
    case "error":
      return { status: "error", httpStatus: failure.status };
  }
}

const chunksOf = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

/**
 * One round of sync for one trip: push the outbox in chunks, then pull everything after the cursor
 * (SPEC.md §5.3). Nothing is lost on any failure: what is not confirmed stays in the outbox.
 */
export async function syncTrip(deps: SyncDeps): Promise<SyncOutcome> {
  const { tripId, store, api } = deps;
  const state = await store.readSyncState(tripId);
  if (!state || !state.token) return { status: "local" };
  // The old link is all this device has: nothing works until the new one is opened (SPEC.md §4).
  if (state.access === "link_changed" || state.access === "unavailable") return { status: state.access };
  const { token } = state;

  let pushed = 0;
  let rejected = 0;
  let outbox: OutboxItem[] = state.outbox;
  for (const chunk of chunksOf(outbox, PUSH_CHUNK)) {
    const answer = await api.push(token, chunk.map((item) => item.operation));
    if (answer.kind !== "ok") return settleFailure(answer, deps);
    const settled: Settled[] = chunk.map((item, i) => {
      const result = answer.results[i];
      if (result && result.status !== "rejected") return { item, status: "confirmed", seq: result.seq };
      return { item, status: "rejected", reason: result?.reason ?? "malformed", detail: result?.detail ?? "" };
    });
    await store.applyPush(tripId, settled);
    pushed += settled.filter((s) => s.status === "confirmed").length;
    rejected += settled.filter((s) => s.status === "rejected").length;
    outbox = outbox.filter((item) => !chunk.includes(item));
  }

  let cursor = state.lastSeq;
  let pulled = 0;
  for (;;) {
    const page = await api.pull(token, cursor);
    if (page.kind !== "ok") return settleFailure(page, deps);
    // An operation this version cannot read stays out of the fold; the cursor still moves past it.
    const readable: SequencedOperation[] = page.operations.filter(({ operation }) => parseOperation(operation).ok);
    cursor = page.operations.at(-1)?.seq ?? cursor;
    await store.applyPull(tripId, readable, cursor);
    pulled += readable.length;
    if (!page.hasMore || page.operations.length === 0) break;
  }

  // Answering normally means the trip is alive and this token is current (a restore from another device lands here).
  if (state.access !== "ok") await store.setAccess(tripId, "ok", null);
  return { status: "synced", pushed, rejected, pulled };
}

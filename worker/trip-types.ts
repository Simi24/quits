import type { StoredOperation } from "../domain/index.ts";

export type RejectReason = "malformed" | "unknown_version" | "server_action";

/** What push says about one operation of the batch (SPEC.md §5.1, §6.2). */
export type PushResult =
  | { id: string; status: "appended" | "stored"; seq: number }
  | { id: string | null; status: "rejected"; reason: RejectReason; detail: string };

export type DeletedInfo = {
  /** The participant who deleted the trip. */
  deletedBy: string;
  deletedAt: string;
  restoreUntil: string;
};

/** A deleted trip refuses everything but a restore (SPEC.md §6.4). */
export type Gated<T> = { status: "ok"; value: T } | { status: "deleted"; deleted: DeletedInfo };

export type PulledOperation = { seq: number; operation: StoredOperation };
export type Page = { operations: PulledOperation[]; hasMore: boolean };

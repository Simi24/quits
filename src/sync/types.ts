import type { Operation, SequencedOperation, StoredOperation } from "../../domain";

/** What the device knows about the trip's link and life (SPEC.md §6.4). */
export type Access = "ok" | "link_changed" | "deleted" | "unavailable";

/** Who deleted the trip and until when it can be restored (SPEC.md §6.4). */
export interface Deletion {
  deletedBy: string;
  deletedAt: string;
  restoreUntil: string;
}

export interface OutboxItem {
  n: number;
  operation: Operation;
}

export interface RejectedItem {
  operation: StoredOperation;
  reason: string;
  detail: string;
}

/** One answer of push, per operation, in the order sent (SPEC.md §6.2). */
export type PushResult =
  | { id: string; status: "appended" | "stored"; seq: number }
  | { id: string | null; status: "rejected"; reason: string; detail: string };

export interface PullPage {
  tripId: string;
  operations: SequencedOperation[];
  hasMore: boolean;
}

export interface ServerAction {
  tripId: string;
  seq: number | null;
}

/** Everything but success: the answers a client has to tell apart (SPEC.md §6.4). */
export type ApiFailure =
  | { kind: "offline" }
  | { kind: "link_changed"; tripId: string }
  | { kind: "deleted"; tripId: string; deletion: Deletion }
  | { kind: "unavailable" }
  | { kind: "forbidden" }
  | { kind: "error"; status: number };

export type ApiResult<T> = ({ kind: "ok" } & T) | ApiFailure;

/** The HTTP API as the sync engine sees it. */
export interface Api {
  push: (token: string, operations: Operation[]) => Promise<ApiResult<{ tripId: string; results: PushResult[] }>>;
  pull: (token: string, after: number) => Promise<ApiResult<PullPage>>;
  createTrip: (code: string, operation: Operation) => Promise<ApiResult<{ tripId: string; token: string; seq: number }>>;
  checkCode: (code: string) => Promise<ApiResult<object>>;
  regenerateLink: (token: string, operation: Operation) => Promise<ApiResult<{ tripId: string; token: string; seq: number }>>;
  deleteTrip: (token: string, operation: Operation) => Promise<ApiResult<{ tripId: string; seq: number } & Deletion>>;
  restoreTrip: (token: string, operation: Operation) => Promise<ApiResult<{ tripId: string; restored: boolean; seq: number | null; alreadyApplied?: boolean }>>;
}

export interface SyncState {
  token: string | null;
  lastSeq: number;
  access: Access;
  /** In the order they were written. */
  outbox: OutboxItem[];
}

export type Settled =
  | { item: OutboxItem; status: "confirmed"; seq: number }
  | { item: OutboxItem; status: "rejected"; reason: string; detail: string };

/** Where the engine keeps what it learns. IndexedDB in the app, memory in tests. */
export interface SyncStore {
  readSyncState: (tripId: string) => Promise<SyncState | undefined>;
  /** Confirmed ones move to the confirmed log, rejected ones to the `rejected` store; both leave the outbox, in one step. */
  applyPush: (tripId: string, settled: Settled[]) => Promise<void>;
  /** Adds the operations to the confirmed log and moves the cursor, in one step. */
  applyPull: (tripId: string, operations: SequencedOperation[], lastSeq: number) => Promise<void>;
  /**
   * Remembers what the server said about the trip when asked with `token`. Ignored once the trip holds
   * another token: an answer about a link this device has since replaced is no longer about this trip's link.
   */
  setAccess: (tripId: string, token: string, access: Access, deletion: Deletion | null) => Promise<void>;
}

/** What opening a link needs on top of syncing: finding the trip a token belongs to, and adopting one. */
export interface LinkStore extends SyncStore {
  /** The trip on this device whose current token this is. */
  findByToken: (token: string) => Promise<string | undefined>;
  hasTrip: (tripId: string) => Promise<boolean>;
  /** Starts the trip on this device (as `meId`, for the device that created it), or swaps in the new token of one it already has. */
  adoptTrip: (tripId: string, token: string, meId?: string) => Promise<void>;
}

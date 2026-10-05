// Test helper only: the behaviour of SPEC.md §6 that the sync engine relies on, in memory.
import { parseOperation } from "../../../domain";
import type { Operation, StoredOperation } from "../../../domain";
import type { Api, ApiFailure, ApiResult, Deletion, PullPage, PushResult } from "../types";

const NOT_IMPLEMENTED = async (): Promise<never> => {
  throw new Error("not used by the sync engine");
};

export class FakeServer {
  tripId = "trip-1";
  log: { seq: number; operation: StoredOperation }[] = [];
  /** Set to make every trip request fail like that. */
  failure: ApiFailure | null = null;
  pageSize = 500;
  pushCalls: Operation[][] = [];
  pullCalls: number[] = [];

  /** An operation another device pushed. */
  external(operation: StoredOperation) {
    this.log.push({ seq: this.log.length + 1, operation });
  }

  api: Api = {
    push: async (_token, operations) => {
      this.pushCalls.push(operations);
      if (this.failure) return this.failure;
      const results: PushResult[] = operations.map((operation) => {
        const parsed = parseOperation(operation);
        if (!parsed.ok) return { id: null, status: "rejected", reason: parsed.reason, detail: parsed.detail };
        const stored = this.log.find((entry) => entry.operation.id === operation.id);
        if (stored) return { id: operation.id, status: "stored", seq: stored.seq };
        const seq = this.log.length + 1;
        this.log.push({ seq, operation });
        return { id: operation.id, status: "appended", seq };
      });
      return { kind: "ok", tripId: this.tripId, results } as ApiResult<{ tripId: string; results: PushResult[] }>;
    },
    pull: async (_token, after) => {
      this.pullCalls.push(after);
      if (this.failure) return this.failure;
      const rest = this.log.filter((entry) => entry.seq > after);
      const page: PullPage = { tripId: this.tripId, operations: rest.slice(0, this.pageSize), hasMore: rest.length > this.pageSize };
      return { kind: "ok", ...page };
    },
    createTrip: NOT_IMPLEMENTED,
    checkCode: NOT_IMPLEMENTED,
    regenerateLink: NOT_IMPLEMENTED,
    deleteTrip: NOT_IMPLEMENTED,
    restoreTrip: NOT_IMPLEMENTED,
  };
}

export const deletion: Deletion = { deletedBy: "p2", deletedAt: "2026-07-01T10:00:00Z", restoreUntil: "2026-07-31T10:00:00Z" };

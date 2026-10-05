// Test helper only: the SyncStore contract in memory.
import type { Operation, SequencedOperation, StoredOperation } from "../../../domain";
import type { Access, Deletion, LinkStore, OutboxItem, RejectedItem, Settled, SyncState } from "../types";

export class MemoryStore implements LinkStore {
  tripIds = new Set<string>();
  adopted: { tripId: string; token: string }[] = [];
  token: string | null = "token-1";
  lastSeq = 0;
  access: Access = "ok";
  deletion: Deletion | null = null;
  outbox: OutboxItem[] = [];
  confirmed = new Map<number, StoredOperation>();
  rejected: RejectedItem[] = [];
  private next = 0;

  /** Writes to the outbox the way a local change does. */
  write(...operations: Operation[]) {
    for (const operation of operations) this.outbox.push({ n: this.next++, operation });
  }

  confirmedLog(): SequencedOperation[] {
    return [...this.confirmed].sort(([a], [b]) => a - b).map(([seq, operation]) => ({ seq, operation }));
  }

  readSyncState = async (): Promise<SyncState> => ({ token: this.token, lastSeq: this.lastSeq, access: this.access, outbox: [...this.outbox] });

  applyPush = async (_tripId: string, settled: Settled[]) => {
    for (const entry of settled) {
      this.outbox = this.outbox.filter((item) => item.n !== entry.item.n);
      if (entry.status === "confirmed") this.confirmed.set(entry.seq, entry.item.operation);
      else this.rejected.push({ operation: entry.item.operation, reason: entry.reason, detail: entry.detail });
    }
  };

  applyPull = async (_tripId: string, operations: SequencedOperation[], lastSeq: number) => {
    for (const { seq, operation } of operations) this.confirmed.set(seq, operation);
    this.lastSeq = Math.max(this.lastSeq, lastSeq);
  };

  setAccess = async (_tripId: string, access: Access, deletion: Deletion | null) => {
    this.access = access;
    this.deletion = deletion;
  };

  findByToken = async (token: string) => (this.token === token && this.tripIds.size > 0 ? [...this.tripIds][0] : undefined);

  hasTrip = async (tripId: string) => this.tripIds.has(tripId);

  adoptTrip = async (tripId: string, token: string) => {
    this.tripIds.add(tripId);
    this.token = token;
    this.access = "ok";
    this.adopted.push({ tripId, token });
  };
}

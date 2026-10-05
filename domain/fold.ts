import { expenseHandlers } from "./handlers/expenses.ts";
import type { Ctx, FoldEntry, Handlers } from "./handlers/context.ts";
import { settlementHandlers } from "./handlers/settlements.ts";
import { tripHandlers } from "./handlers/trip.ts";
import { upcastOperation } from "./operations.ts";
import type { Operation, SequencedOperation } from "./operations.ts";
import type { IgnoredReason, Trip } from "./trip.ts";

const handlers: Handlers = { ...tripHandlers, ...expenseHandlers, ...settlementHandlers };

const emptyTrip = (): Trip => ({
  name: "",
  currency: "EUR",
  from: null,
  to: null,
  defaultSplit: { method: "equal" },
  status: "open",
  changesAfterClose: 0,
  deleted: false,
  participants: [],
  mergedInto: {},
  merges: [],
  expenses: [],
  settlements: [],
  categories: [],
  history: [],
  lastSeq: 0,
});

/** Folds entries already sorted by sequence. An operation id counts once, however often it arrives. */
export function foldEntries(entries: FoldEntry[]): Trip {
  const trip = emptyTrip();
  const seen = new Set<string>();
  for (const entry of entries) {
    const { operation } = entry;
    if (seen.has(operation.id)) continue;
    seen.add(operation.id);
    let ignored: IgnoredReason | null = null;
    const ctx: Ctx = {
      trip,
      entry,
      afterClose: trip.status === "closed",
      ignore: (reason) => {
        ignored = reason;
      },
    };
    (handlers[operation.type] as ((c: Ctx, o: Operation) => void) | undefined)?.(ctx, operation);
    trip.history.push({
      seq: entry.seq,
      opId: operation.id,
      type: operation.type,
      by: operation.by,
      at: operation.at,
      afterClose: false,
      pending: entry.pending,
      ignored,
    });
    trip.lastSeq = Math.max(trip.lastSeq, entry.seq);
  }
  return trip;
}

/** The trip a log of sequenced operations adds up to. The same log gives the same trip on every device. */
export function foldTrip(log: SequencedOperation[]): Trip {
  const entries = [...log]
    .sort((a, b) => a.seq - b.seq)
    .map(({ seq, operation }) => ({ seq, operation: upcastOperation(operation), pending: false }));
  return foldEntries(entries);
}

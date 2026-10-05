import { categoryHandlers } from "./handlers/categories.ts";
import { expenseHandlers } from "./handlers/expenses.ts";
import type { Ctx, FoldEntry, Handlers } from "./handlers/context.ts";
import { participantHandlers } from "./handlers/participants.ts";
import { settlementHandlers } from "./handlers/settlements.ts";
import { tripHandlers } from "./handlers/trip.ts";
import { upcastOperation } from "./operations.ts";
import type { Operation, SequencedOperation, StoredOperation } from "./operations.ts";
import type { IgnoredReason, Trip } from "./trip.ts";

const handlers: Handlers = { ...tripHandlers, ...expenseHandlers, ...settlementHandlers, ...participantHandlers, ...categoryHandlers };

/** Server actions and the close itself are not "changes that arrived after closing". */
const notAChange = new Set<Operation["type"]>([
  "TripClosed",
  "TripReopened",
  "TripDeleted",
  "TripRestored",
  "LinkRegenerated",
]);

const emptyTrip = (): Trip => ({
  name: "",
  currency: "EUR",
  from: null,
  to: null,
  defaultSplit: { method: "equal" },
  status: "open",
  changesAfterClose: 0,
  deleted: false,
  roster: [],
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
      afterClose: trip.status === "closed" && !notAChange.has(operation.type),
      ignore: (reason) => {
        ignored = reason;
      },
    };
    (handlers[operation.type] as ((c: Ctx, o: Operation) => void) | undefined)?.(ctx, operation);
    if (ctx.afterClose) trip.changesAfterClose += 1;
    trip.history.push({
      seq: entry.seq,
      opId: operation.id,
      type: operation.type,
      by: operation.by,
      at: operation.at,
      afterClose: ctx.afterClose,
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

/**
 * The confirmed log with the device's pending operations folded on top, in outbox order (SPEC.md §5.1).
 * Call it again after every pull: a pending operation the server has since confirmed counts once,
 * at its confirmed place.
 */
export function foldWithPending(confirmed: SequencedOperation[], pending: StoredOperation[]): Trip {
  const sorted = [...confirmed].sort((a, b) => a.seq - b.seq);
  const confirmedIds = new Set(sorted.map((c) => c.operation.id));
  const lastSeq = sorted.at(-1)?.seq ?? 0;
  const entries: FoldEntry[] = sorted.map(({ seq, operation }) => ({ seq, operation: upcastOperation(operation), pending: false }));
  pending
    .filter((operation) => !confirmedIds.has(operation.id))
    .forEach((operation, i) => entries.push({ seq: lastSeq + 1 + i, operation: upcastOperation(operation), pending: true }));
  return foldEntries(entries);
}

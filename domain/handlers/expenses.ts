import type { Handlers } from "./context.ts";
import { participantsOf } from "../references.ts";
import { allKnownIn, reviveParticipants } from "./references.ts";

export const expenseHandlers: Handlers = {
  ExpenseCreated({ trip, entry, afterClose, ignore }, op) {
    if (trip.expenses.some((e) => e.id === op.expenseId)) return;
    if (!allKnownIn(trip, op.expense)) return ignore("unknown_participant");
    reviveParticipants(trip, participantsOf(op.expense));
    trip.expenses.push({
      id: op.expenseId,
      deleted: false,
      snapshot: op.expense,
      versions: [
        {
          opId: op.id,
          seq: entry.seq,
          by: op.by,
          at: op.at,
          kind: "created",
          baseOpId: null,
          snapshot: op.expense,
          afterClose,
        },
      ],
      conflict: null,
    });
  },
  ExpenseEdited({ trip, entry, afterClose, ignore }, op) {
    const record = trip.expenses.find((e) => e.id === op.expenseId);
    if (!record) return ignore("unknown_target");
    if (!allKnownIn(trip, op.expense)) return ignore("unknown_participant");
    if (!record.deleted) reviveParticipants(trip, participantsOf(op.expense));
    // Two edits with the same base never saw each other: a conflict. The last one sequenced wins whole.
    if (record.conflict?.winnerOpId === op.baseOpId) record.conflict = null;
    const concurrent = record.versions.filter((v) => v.kind === "edited" && v.baseOpId === op.baseOpId);
    if (concurrent.length > 0) {
      const earlier = record.conflict?.baseOpId === op.baseOpId ? record.conflict.loserOpIds : [];
      const losers = [...new Set([...earlier, ...concurrent.map((v) => v.opId)])];
      record.conflict = { baseOpId: op.baseOpId, winnerOpId: op.id, loserOpIds: losers };
    }
    record.snapshot = op.expense;
    record.versions.push({
      opId: op.id,
      seq: entry.seq,
      by: op.by,
      at: op.at,
      kind: "edited",
      baseOpId: op.baseOpId,
      snapshot: op.expense,
      afterClose,
    });
  },
  ExpenseDeleted({ trip, ignore }, op) {
    const record = trip.expenses.find((e) => e.id === op.expenseId);
    if (!record) return ignore("unknown_target");
    record.deleted = true;
  },
  /** A deleted expense comes back as its latest version by sequence, even an edit that lost to the delete. */
  ExpenseRestored({ trip, ignore }, op) {
    const record = trip.expenses.find((e) => e.id === op.expenseId);
    if (!record) return ignore("unknown_target");
    record.deleted = false;
    reviveParticipants(trip, participantsOf(record.snapshot));
  },
};

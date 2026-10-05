import type { Operation } from "../operations.ts";
import { participantsOf } from "../references.ts";
import type { ExpenseRecord, ExpenseVersion, Trip } from "../trip.ts";
import { conflictAfter } from "./conflict.ts";
import type { Ctx, Handlers } from "./context.ts";
import { allKnownIn, reviveParticipants } from "./references.ts";

type ExpenseWrite = Extract<Operation, { type: "ExpenseCreated" | "ExpenseEdited" }>;

const findExpense = (trip: Trip, id: string): ExpenseRecord | undefined => trip.expenses.find((e) => e.id === id);

const versionOf = ({ entry, afterClose }: Ctx, op: ExpenseWrite): ExpenseVersion => ({
  opId: op.id,
  seq: entry.seq,
  by: op.by,
  at: op.at,
  kind: op.type === "ExpenseCreated" ? "created" : "edited",
  baseOpId: op.type === "ExpenseEdited" ? op.baseOpId : null,
  snapshot: op.expense,
  afterClose,
});

export const expenseHandlers: Handlers = {
  ExpenseCreated(ctx, op) {
    const { trip, ignore } = ctx;
    if (findExpense(trip, op.expenseId)) return;
    if (!allKnownIn(trip, op.expense)) return ignore("unknown_participant");
    reviveParticipants(trip, participantsOf(op.expense));
    trip.expenses.push({ id: op.expenseId, deleted: false, snapshot: op.expense, versions: [versionOf(ctx, op)], conflict: null });
  },
  /** The whole snapshot replaces the expense; an edit sequenced after a delete is kept but does not undelete. */
  ExpenseEdited(ctx, op) {
    const { trip, ignore } = ctx;
    const record = findExpense(trip, op.expenseId);
    if (!record) return ignore("unknown_target");
    if (!allKnownIn(trip, op.expense)) return ignore("unknown_participant");
    if (!record.deleted) reviveParticipants(trip, participantsOf(op.expense));
    record.conflict = conflictAfter(record, { opId: op.id, baseOpId: op.baseOpId });
    record.snapshot = op.expense;
    record.versions.push(versionOf(ctx, op));
  },
  ExpenseDeleted({ trip, ignore }, op) {
    const record = findExpense(trip, op.expenseId);
    if (!record) return ignore("unknown_target");
    record.deleted = true;
  },
  /** A deleted expense comes back as its latest version by sequence, even an edit that lost to the delete. */
  ExpenseRestored({ trip, ignore }, op) {
    const record = findExpense(trip, op.expenseId);
    if (!record) return ignore("unknown_target");
    record.deleted = false;
    reviveParticipants(trip, participantsOf(record.snapshot));
  },
};

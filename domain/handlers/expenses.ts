import type { Handlers } from "./context.ts";

export const expenseHandlers: Handlers = {
  ExpenseCreated({ trip, entry, afterClose }, op) {
    if (trip.expenses.some((e) => e.id === op.expenseId)) return;
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
  ExpenseDeleted({ trip, ignore }, op) {
    const record = trip.expenses.find((e) => e.id === op.expenseId);
    if (!record) return ignore("unknown_target");
    record.deleted = true;
  },
};

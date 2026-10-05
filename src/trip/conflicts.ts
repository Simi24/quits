import type { ExpenseRecord } from "../../domain";

/** A conflict this device has not yet dismissed with "Va bene così" (SPEC.md §7.6 item 7). */
export const isUnseenConflict = (expense: ExpenseRecord, seen: string[]): boolean =>
  expense.conflict !== null && !seen.includes(expense.conflict.winnerOpId);

import type { ExpenseRecord, Trip } from "../../domain";

/** A conflict this device has not yet dismissed with "Va bene così" (SPEC.md §7.6 item 7). */
export const isUnseenConflict = (expense: ExpenseRecord, seen: string[]): boolean =>
  expense.conflict !== null && !seen.includes(expense.conflict.winnerOpId);

/** The live expenses whose conflict this device has not dismissed: what the banner on Spese counts and filters to. */
export const unseenConflicts = (trip: Trip, seen: string[]): ExpenseRecord[] =>
  trip.expenses.filter((e) => !e.deleted && isUnseenConflict(e, seen));

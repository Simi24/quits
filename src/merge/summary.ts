import { balances, effectiveExpense, foldWithPending, participantsOf } from "../../domain";
import type { Operation, Trip } from "../../domain";

export interface MergeSummary {
  /** Live expenses X appears in. */
  expenses: number;
  /** Of those, the ones where Y appears too: amounts, percentages and shares are summed (SPEC.md §3.3). */
  expensesWithBoth: number;
  /** Live settlements X gave or received. */
  settlements: number;
  balanceOfFromBefore: number;
  balanceBefore: number;
  balanceAfter: number;
  /** Y's shares in a by-shares default split once X's are added; null when the default split is equal. */
  defaultSharesAfter: number | null;
}

const appearsIn = (trip: Trip, id: string) =>
  trip.expenses
    .filter((e) => !e.deleted)
    .map((e) => participantsOf({ ...e.snapshot, ...effectiveExpense(trip, e.snapshot) }));

/**
 * What "Unisci X in Y" will change, read by folding the log with the merge on top of it, so the summary can
 * never disagree with the result. X is `from`, the survivor Y is `into`.
 */
export function summarizeMerge(operations: Operation[], from: string, into: string): MergeSummary {
  const before = foldWithPending([], operations);
  const preview = { id: "preview", v: 2, by: into, device: "preview", at: new Date().toISOString(), type: "ParticipantsMerged", fromParticipantId: from, intoParticipantId: into } as Operation;
  const after = foldWithPending([], [...operations, preview]);
  const owedBefore = balances(before);
  const touched = appearsIn(before, from);
  const split = after.defaultSplit;
  const resolve = (id: string) => before.mergedInto[id] ?? id;
  return {
    expenses: touched.filter((ids) => ids.includes(from)).length,
    expensesWithBoth: touched.filter((ids) => ids.includes(from) && ids.includes(into)).length,
    settlements: before.settlements.filter((s) => !s.deleted && (resolve(s.fromParticipantId) === from || resolve(s.toParticipantId) === from)).length,
    balanceOfFromBefore: owedBefore[from] ?? 0,
    balanceBefore: owedBefore[into] ?? 0,
    balanceAfter: balances(after)[into] ?? 0,
    defaultSharesAfter: split.method === "shares" ? (split.shares[into] ?? 0) : null,
  };
}

import type { ParticipantId } from "./ids.ts";
import { effectiveExpense, resolveParticipant } from "./merge.ts";
import { splitExpense } from "./shares.ts";
import type { SplitResult } from "./shares.ts";
import type { ExpenseRecord, Trip } from "./trip.ts";

export type Balances = Record<ParticipantId, number>;
export type SuggestedSettlement = {
  fromParticipantId: ParticipantId;
  toParticipantId: ParticipantId;
  amount: number;
};

/** What each participant owes for an expense, and who got the leftover cent. */
export function expenseShares(trip: Trip, expense: ExpenseRecord): SplitResult {
  const order = trip.participants.map((p) => p.id);
  return splitExpense(expense.snapshot.amount, effectiveExpense(trip, expense.snapshot).split, order);
}

/** Paid minus owed, plus settlements given minus received. Positive: the trip owes them. Sums to zero. */
export function balances(trip: Trip): Balances {
  const result: Balances = Object.fromEntries(trip.participants.map((p) => [p.id, 0]));
  const add = (id: ParticipantId, amount: number) => {
    result[id] = (result[id] ?? 0) + amount;
  };
  for (const expense of trip.expenses) {
    if (expense.deleted) continue;
    for (const payer of effectiveExpense(trip, expense.snapshot).payers) add(payer.participantId, payer.amount);
    for (const [id, share] of Object.entries(expenseShares(trip, expense).shares)) add(id, -share);
  }
  for (const s of trip.settlements) {
    if (s.deleted) continue;
    add(resolveParticipant(trip, s.fromParticipantId), s.amount);
    add(resolveParticipant(trip, s.toParticipantId), -s.amount);
  }
  return result;
}

/**
 * Greedy and deterministic: the largest debtor pays the largest creditor, ties by order of entry.
 * At most N-1 payments (SPEC.md §3.10).
 */
export function suggestSettlements(trip: Trip): SuggestedSettlement[] {
  const remaining = balances(trip);
  const order = trip.participants.map((p) => p.id);
  const position = (id: ParticipantId) => order.indexOf(id);
  const suggestions: SuggestedSettlement[] = [];
  for (;;) {
    const creditors = order.filter((id) => (remaining[id] ?? 0) > 0);
    const debtors = order.filter((id) => (remaining[id] ?? 0) < 0);
    creditors.sort((a, b) => remaining[b]! - remaining[a]! || position(a) - position(b));
    debtors.sort((a, b) => remaining[a]! - remaining[b]! || position(a) - position(b));
    const creditor = creditors[0];
    const debtor = debtors[0];
    if (creditor === undefined || debtor === undefined) return suggestions;
    const amount = Math.min(remaining[creditor]!, -remaining[debtor]!);
    suggestions.push({ fromParticipantId: debtor, toParticipantId: creditor, amount });
    remaining[creditor] = remaining[creditor]! - amount;
    remaining[debtor] = remaining[debtor]! + amount;
  }
}

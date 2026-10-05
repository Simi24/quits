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

type Ledger = Record<ParticipantId, number>;

const addTo = (ledger: Ledger, id: ParticipantId, amount: number) => {
  ledger[id] = (ledger[id] ?? 0) + amount;
};

/** What each participant paid and owes over the live expenses, merges applied; refunds count negative. */
export function paidAndDue(trip: Trip): { paid: Ledger; due: Ledger } {
  const paid: Ledger = {};
  const due: Ledger = {};
  for (const expense of trip.expenses) {
    if (expense.deleted) continue;
    for (const payer of effectiveExpense(trip, expense.snapshot).payers) addTo(paid, payer.participantId, payer.amount);
    for (const [id, share] of Object.entries(expenseShares(trip, expense).shares)) addTo(due, id, share);
  }
  return { paid, due };
}

/** Paid minus owed, plus settlements given minus received. Positive: the trip owes them. Sums to zero. */
export function balances(trip: Trip): Balances {
  const result: Balances = Object.fromEntries(trip.participants.map((p) => [p.id, 0]));
  const add = (id: ParticipantId, amount: number) => addTo(result, id, amount);
  const { paid, due } = paidAndDue(trip);
  for (const [id, amount] of Object.entries(paid)) add(id, amount);
  for (const [id, amount] of Object.entries(due)) add(id, -amount);
  for (const s of trip.settlements) {
    if (s.deleted) continue;
    add(resolveParticipant(trip, s.fromParticipantId), s.amount);
    add(resolveParticipant(trip, s.toParticipantId), -s.amount);
  }
  return result;
}

/**
 * Greedy and deterministic: whoever owes most pays whoever is owed most, ties by order of entry.
 * At most N-1 payments (SPEC.md §3.10).
 */
export function suggestSettlements(trip: Trip): SuggestedSettlement[] {
  const remaining = balances(trip);
  const order = trip.participants.map((p) => p.id);
  const position = (id: ParticipantId) => order.indexOf(id);
  const suggestions: SuggestedSettlement[] = [];
  for (;;) {
    const owed = order.filter((id) => (remaining[id] ?? 0) > 0);
    const owing = order.filter((id) => (remaining[id] ?? 0) < 0);
    owed.sort((a, b) => remaining[b]! - remaining[a]! || position(a) - position(b));
    owing.sort((a, b) => remaining[a]! - remaining[b]! || position(a) - position(b));
    const to = owed[0];
    const from = owing[0];
    if (to === undefined || from === undefined) return suggestions;
    const amount = Math.min(remaining[to]!, -remaining[from]!);
    suggestions.push({ fromParticipantId: from, toParticipantId: to, amount });
    remaining[to] = remaining[to]! - amount;
    remaining[from] = remaining[from]! + amount;
  }
}

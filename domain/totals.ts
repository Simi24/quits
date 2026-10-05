import { paidAndDue } from "./balances.ts";
import { resolveCategory } from "./categories.ts";
import type { ParticipantId } from "./ids.ts";
import type { Trip } from "./trip.ts";

export type Totals = {
  /** Σ live expenses, refunds as negatives. */
  total: number;
  /** Trip days, dates inclusive; a missing date is the first or last expense date counted (SPEC.md §8.3). */
  days: number;
  /** Σ shares of the default split, or the number of participants when it is equal. */
  heads: number;
  /** Average per day, leaving out what was dated before the trip started. */
  perDay: number;
  perPersonPerDay: number;
  /** Expenses dated before the start date (bookings): in the total, out of the per-day averages. */
  preTripTotal: number;
  paidDue: { participantId: ParticipantId; paid: number; due: number }[];
  /** Biggest first; ties in the order the categories first appear. */
  byCategory: { categoryId: string; amount: number }[];
};

const DAY = 86_400_000;
const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY;
const inclusiveDays = (from: string, to: string) => Math.max(1, dayNumber(to) - dayNumber(from) + 1);

export function tripTotals(trip: Trip): Totals {
  const live = trip.expenses.filter((e) => !e.deleted);
  const total = live.reduce((sum, e) => sum + e.snapshot.amount, 0);
  // Bookings dated before the start are in the total, out of the per-day averages (SPEC.md §8.3).
  const start = trip.from;
  const counted = start === null ? live : live.filter((e) => e.snapshot.date >= start);
  const preTripTotal = total - counted.reduce((sum, e) => sum + e.snapshot.amount, 0);
  // A missing date is replaced by the first or last counted expense date.
  const dates = counted.map((e) => e.snapshot.date).sort();
  const first = trip.from ?? dates[0];
  const last = trip.to ?? dates.at(-1) ?? first;
  const days = first !== undefined && last !== undefined ? inclusiveDays(first, last) : 1;
  const split = trip.defaultSplit;
  const shareHeads = split.method === "shares" ? Object.values(split.shares).reduce((a, b) => a + b, 0) : 0;
  const heads = shareHeads > 0 ? shareHeads : Math.max(1, trip.participants.length);
  const base = total - preTripTotal;

  const { paid, due } = paidAndDue(trip);
  const byCategory = new Map<string, number>();
  for (const e of live) {
    const categoryId = resolveCategory(trip, e.snapshot.categoryId).id;
    byCategory.set(categoryId, (byCategory.get(categoryId) ?? 0) + e.snapshot.amount);
  }
  return {
    total,
    days,
    heads,
    perDay: Math.round(base / days),
    perPersonPerDay: Math.round(base / days / heads),
    preTripTotal,
    paidDue: trip.participants.map((p) => ({ participantId: p.id, paid: paid[p.id] ?? 0, due: due[p.id] ?? 0 })),
    byCategory: [...byCategory]
      .map(([categoryId, amount]) => ({ categoryId, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

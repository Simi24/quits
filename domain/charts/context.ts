import { expenseShares } from "../balances.ts";
import { resolveCategory, STANDARD_CATEGORIES } from "../categories.ts";
import type { ParticipantId } from "../ids.ts";
import { effectiveExpense } from "../merge.ts";
import type { Payer } from "../expense.ts";
import type { Trip } from "../trip.ts";
import { buildTimeline } from "./timeline.ts";
import type { Timeline } from "./timeline.ts";

export type ChartOptions = {
  /** The device's date, `YYYY-MM-DD`; null when unknown. */
  today: string | null;
  /** "Di chi": one participant's share, or null for the whole group (SPEC.md §8.1). */
  who: ParticipantId | null;
};

/** A live expense as the charts read it. */
export type ChartExpense = {
  id: string;
  description: string;
  date: string;
  /** The resolved category: an unknown or deleted one reads as Other. */
  categoryId: string;
  /** The whole expense, signed. */
  fullAmount: number;
  /** What the chart counts: the whole amount, or the chosen person's share. Zero when they are not in it. */
  amount: number;
  payers: Payer[];
  shares: Record<ParticipantId, number>;
  /** When the expense was first written, to order the events of one day. */
  at: string;
  /** Dated before the start date. */
  pre: boolean;
};

export type ChartContext = {
  trip: Trip;
  who: ParticipantId | null;
  timeline: Timeline;
  expenses: ChartExpense[];
  /** Σ shares of the default split for the group; the chosen person's own shares otherwise (the couple counts 2). */
  heads: number;
  /** Category ids in the fixed stack and legend order (SPEC.md §8.3), custom ones last. */
  order: string[];
};

/** Spesa, Alloggio, Ristoranti, Attività, Trasporti, Altro (SPEC.md §8.3). */
const STACK_ORDER = ["groceries", "accommodation", "restaurants", "activities", "transport", "other"] as const;

export const categoryOrder = (trip: Trip): string[] => [
  ...STANDARD_CATEGORIES.map((c) => c.id).sort((a, b) => STACK_ORDER.indexOf(a as never) - STACK_ORDER.indexOf(b as never)),
  ...trip.categories.map((c) => c.id),
];

export function headsOf(trip: Trip, who: ParticipantId | null): number {
  const split = trip.defaultSplit;
  if (who !== null) return split.method === "shares" ? Math.max(1, split.shares[who] ?? 1) : 1;
  const total = split.method === "shares" ? Object.values(split.shares).reduce((a, b) => a + b, 0) : 0;
  return total > 0 ? total : Math.max(1, trip.participants.length);
}

export function chartContext(trip: Trip, options: ChartOptions): ChartContext {
  const who = options.who !== null && trip.participants.some((p) => p.id === options.who) ? options.who : null;
  const timeline = buildTimeline(trip, options.today);
  const expenses = trip.expenses
    .filter((e) => !e.deleted)
    .map((e): ChartExpense => {
      const shares = expenseShares(trip, e).shares;
      const snapshot = e.snapshot;
      return {
        id: e.id,
        description: snapshot.description,
        date: snapshot.date,
        categoryId: resolveCategory(trip, snapshot.categoryId).id,
        fullAmount: snapshot.amount,
        amount: who === null ? snapshot.amount : (shares[who] ?? 0),
        payers: effectiveExpense(trip, snapshot).payers,
        shares,
        at: e.versions[0]?.at ?? "",
        pre: trip.from !== null && snapshot.date < trip.from,
      };
    });
  return { trip, who, timeline, expenses, heads: headsOf(trip, who), order: categoryOrder(trip) };
}

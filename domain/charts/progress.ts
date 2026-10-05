import type { ChartContext } from "./context.ts";

export type Progress = {
  /** Σ live expenses, in the viewer's terms, refunds netted; bookings before the start included. */
  total: number;
  /** The part of the total dated before the start date. */
  preTrip: number;
  /** One total per trip day, bookings left out. */
  dayTotals: number[];
  /** Running total per trip day, starting from the bookings. */
  cumulative: number[];
  /** How many days the solid line covers; the rest is shaded or projected. */
  solid: number;
  /** Mean of the last min(3, N) day totals; only while the trip runs (SPEC.md §8.2). */
  pace: number | null;
  /** Total so far + pace × days remaining; null unless the trip runs. */
  projection: number | null;
  /** Average over the days gone (all of them once over), bookings left out. */
  perDay: number;
  perPersonPerDay: number;
  /** The most expensive day, for the line shown once the trip is over. */
  peakDay: { date: string; amount: number } | null;
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export function progress(ctx: ChartContext): Progress {
  const { timeline, expenses } = ctx;
  const { dates } = timeline;
  const dayTotals = dates.map(() => 0);
  let preTrip = 0;
  for (const e of expenses) {
    const index = dates.indexOf(e.date);
    if (e.pre || index < 0) preTrip += e.amount;
    else dayTotals[index]! += e.amount;
  }
  const total = preTrip + sum(dayTotals);
  const cumulative = dayTotals.map((_, i) => preTrip + sum(dayTotals.slice(0, i + 1)));
  const lastActive = dayTotals.findLastIndex((v) => v !== 0);
  const running = timeline.phase === "running";
  const solid = running ? Math.max(timeline.elapsed, lastActive + 1) : timeline.phase === "before" ? lastActive + 1 : dates.length;

  let pace: number | null = null;
  let projection: number | null = null;
  if (running) {
    const n = timeline.elapsed;
    const mean = sum(dayTotals.slice(Math.max(0, n - 3), n)) / Math.min(3, n);
    pace = Math.round(mean);
    projection = Math.round(total + mean * (dates.length - n));
  }

  const averageDays = Math.max(1, timeline.elapsed > 0 ? timeline.elapsed : dates.length);
  const inTrip = total - preTrip;
  const peak = dayTotals.indexOf(Math.max(0, ...dayTotals));
  return {
    total,
    preTrip,
    dayTotals,
    cumulative,
    solid,
    pace,
    projection,
    perDay: Math.round(inTrip / averageDays),
    perPersonPerDay: Math.round(inTrip / averageDays / ctx.heads),
    peakDay: peak >= 0 && dayTotals[peak]! > 0 ? { date: dates[peak]!, amount: dayTotals[peak]! } : null,
  };
}

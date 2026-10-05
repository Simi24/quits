import type { ChartContext } from "./context.ts";

export type DayBucket = {
  /** Null for the "Prima del viaggio" bucket. */
  date: string | null;
  pre: boolean;
  /** Signed amount per category id; a refund is below zero. */
  byCategory: Record<string, number>;
  /** Net of the refunds. */
  total: number;
};

export type DaysChart = {
  /** The bookings bucket first when there is one, then the trip days. */
  buckets: DayBucket[];
  /** Category ids in stack order. */
  order: string[];
  /** Index in `buckets` of the most expensive day, or -1. */
  peak: number;
};

export function daysChart(ctx: ChartContext): DaysChart {
  const { timeline, expenses, order } = ctx;
  const empty = (): Record<string, number> => Object.fromEntries(order.map((id) => [id, 0]));
  const pre = timeline.hasPre ? [{ date: null, pre: true, byCategory: empty(), total: 0 }] : [];
  const buckets: DayBucket[] = [...pre, ...timeline.dates.map((date) => ({ date, pre: false, byCategory: empty(), total: 0 }))];
  for (const e of expenses) {
    const bucket = e.pre || !timeline.dates.includes(e.date) ? buckets[0] : buckets.find((b) => b.date === e.date);
    if (!bucket) continue;
    bucket.byCategory[e.categoryId] = (bucket.byCategory[e.categoryId] ?? 0) + e.amount;
    bucket.total += e.amount;
  }
  const top = Math.max(0, ...buckets.filter((b) => !b.pre).map((b) => b.total));
  return { buckets, order, peak: top > 0 ? buckets.findIndex((b) => !b.pre && b.total === top) : -1 };
}

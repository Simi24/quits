import type { ChartContext, ChartExpense } from "./context.ts";

export type CategoryRow = {
  categoryId: string;
  /** Net of the refunds. */
  amount: number;
  /** Share of the total, 0 to 1. */
  share: number;
  /** Expenses that add to the amount (refunds are not counted). */
  count: number;
  /** Σ refunds in the category, negative. */
  refunds: number;
  biggest: { expenseId: string; description: string; amount: number } | null;
  /** Per person per day, bookings left out. */
  perPersonPerDay: number;
};

/** Spend by category, biggest first; ties keep the stack order (SPEC.md §8.2, chart 1). */
export function categoryRows(ctx: ChartContext, total: number): CategoryRow[] {
  const { timeline, order, expenses } = ctx;
  const days = Math.max(1, timeline.elapsed > 0 ? timeline.elapsed : timeline.dates.length);
  const rows = order.map((categoryId): CategoryRow => {
    const own = expenses.filter((e: ChartExpense) => e.categoryId === categoryId && e.amount !== 0);
    const gains = own.filter((e) => e.amount > 0);
    const top = gains.reduce<ChartExpense | null>((best, e) => (best === null || e.amount > best.amount ? e : best), null);
    const amount = own.reduce((sum, e) => sum + e.amount, 0);
    const inTrip = own.filter((e) => !e.pre).reduce((sum, e) => sum + e.amount, 0);
    return {
      categoryId,
      amount,
      share: total === 0 ? 0 : amount / total,
      count: gains.length,
      refunds: own.filter((e) => e.amount < 0).reduce((sum, e) => sum + e.amount, 0),
      biggest: top ? { expenseId: top.id, description: top.description, amount: top.amount } : null,
      perPersonPerDay: Math.round(inTrip / days / ctx.heads),
    };
  });
  return rows.filter((r) => r.amount !== 0).sort((a, b) => b.amount - a.amount);
}

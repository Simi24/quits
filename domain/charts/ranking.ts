import type { Payer } from "../expense.ts";
import type { ParticipantId } from "../ids.ts";
import type { ChartContext } from "./context.ts";

export type RankedExpense = {
  expenseId: string;
  description: string;
  date: string;
  categoryId: string;
  /** What the chart ranks by: the whole amount, or the chosen person's share. */
  amount: number;
  fullAmount: number;
  payers: Payer[];
  shares: Record<ParticipantId, number>;
};

export const RANKING_LIMIT = 10;

/** The biggest expenses, refunds excluded (SPEC.md §8.2, chart 7); the first 5 show, "Mostra tutte" adds up to 10. */
export function ranking(ctx: ChartContext): RankedExpense[] {
  return ctx.expenses
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, RANKING_LIMIT)
    .map((e) => ({
      expenseId: e.id,
      description: e.description,
      date: e.date,
      categoryId: e.categoryId,
      amount: e.amount,
      fullAmount: e.fullAmount,
      payers: e.payers,
      shares: e.shares,
    }));
}

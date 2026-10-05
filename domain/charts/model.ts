import { bank } from "./bank.ts";
import { categoryRows } from "./categories.ts";
import { chartContext } from "./context.ts";
import type { ChartOptions } from "./context.ts";
import { daysChart } from "./daily.ts";
import { matrix } from "./matrix.ts";
import { paidDue } from "./paid-due.ts";
import { progress } from "./progress.ts";
import { ranking } from "./ranking.ts";

/** Everything the Grafici tab draws, folded from the trip (SPEC.md §8). Pure: the same trip gives the same numbers on every device. */
export function chartModel(trip: Parameters<typeof chartContext>[0], options: ChartOptions) {
  const ctx = chartContext(trip, options);
  const p = progress(ctx);
  return {
    who: ctx.who,
    timeline: ctx.timeline,
    heads: ctx.heads,
    progress: p,
    days: daysChart(ctx),
    categories: categoryRows(ctx, p.total),
    ranking: ranking(ctx),
    paidDue: paidDue(ctx),
    matrix: matrix(ctx),
    bank: bank(ctx),
  };
}

export type ChartModel = ReturnType<typeof chartModel>;

import type { ParticipantId } from "../ids.ts";
import type { ChartContext } from "./context.ts";

export type Matrix = {
  /** Categories that have an expense, in stack order. */
  categoryIds: string[];
  participantIds: ParticipantId[];
  /** Share per category and person; a refund can pull a cell below zero. */
  cells: Record<string, Record<ParticipantId, number>>;
  /** Σ per person: equal to what each is due. */
  totals: Record<ParticipantId, number>;
  /** The largest cell, for shading and the postcard. */
  max: number;
  best: { categoryId: string; participantId: ParticipantId; amount: number } | null;
};

/** Everyone's share, category by category (SPEC.md §8.2, chart 5). It always shows the whole group. */
export function matrix(ctx: ChartContext): Matrix {
  const participantIds = ctx.trip.participants.map((p) => p.id);
  const categoryIds = ctx.order.filter((id) => ctx.expenses.some((e) => e.categoryId === id));
  const cells: Matrix["cells"] = Object.fromEntries(categoryIds.map((c) => [c, Object.fromEntries(participantIds.map((p) => [p, 0]))]));
  const totals: Matrix["totals"] = Object.fromEntries(participantIds.map((p) => [p, 0]));
  for (const e of ctx.expenses) {
    for (const [id, share] of Object.entries(e.shares)) {
      const row = cells[e.categoryId];
      if (!row || row[id] === undefined) continue;
      row[id] += share;
      totals[id]! += share;
    }
  }
  let best: Matrix["best"] = null;
  for (const categoryId of categoryIds) {
    for (const participantId of participantIds) {
      const amount = cells[categoryId]![participantId]!;
      if (amount > 0 && (best === null || amount > best.amount)) best = { categoryId, participantId, amount };
    }
  }
  return { categoryIds, participantIds, cells, totals, max: Math.max(1, best?.amount ?? 1), best };
}

import type { ParticipantId } from "./ids.ts";
import type { Split } from "./split.ts";

export type SplitResult = {
  /** What each participant owes, in minor units, with the sign of the amount. */
  shares: Record<ParticipantId, number>;
  /** Participants who got a leftover cent, in the order they got it. */
  leftover: ParticipantId[];
};

function weightsOf(split: Split, order: ParticipantId[]): number[] {
  switch (split.method) {
    case "equal":
      return order.map((id) => (split.among.includes(id) ? 1 : 0));
    case "shares":
      return order.map((id) => split.shares[id] ?? 0);
    case "percentage":
      return order.map((id) => Math.round((split.percentages[id] ?? 0) * 100));
    case "exact":
      return order.map(() => 0);
  }
}

/**
 * Divides `amount` (minor units, negative for a refund) by `split`.
 * Largest remainder: leftover cents go to the biggest remainders, ties by `order` (order of entry).
 */
export function splitExpense(amount: number, split: Split, order: ParticipantId[]): SplitResult {
  const sign = amount < 0 ? -1 : 1;
  if (split.method === "exact") {
    const shares: Record<ParticipantId, number> = {};
    for (const id of order) {
      const exact = split.amounts[id];
      if (exact) shares[id] = sign * exact;
    }
    return { shares, leftover: [] };
  }
  const weights = weightsOf(split, order);
  const total = Math.abs(amount);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum === 0) return { shares: {}, leftover: [] };
  const rows = order.map((id, index) => {
    const w = weights[index] ?? 0;
    return { id, index, w, floor: Math.floor((total * w) / weightSum), remainder: (total * w) % weightSum };
  });
  const rem = total - rows.reduce((a, row) => a + row.floor, 0);
  const byRemainder = rows
    .filter((row) => row.w > 0)
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const leftover: ParticipantId[] = [];
  for (const row of byRemainder.slice(0, rem)) {
    row.floor += 1;
    leftover.push(row.id);
  }
  const shares: Record<ParticipantId, number> = {};
  for (const row of rows) if (row.w > 0) shares[row.id] = sign * row.floor;
  return { shares, leftover };
}

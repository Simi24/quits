import { paidAndDue } from "../balances.ts";
import type { ParticipantId } from "../ids.ts";
import type { ChartContext } from "./context.ts";

export type PaidDueRow = {
  participantId: ParticipantId;
  paid: number;
  due: number;
  /** Paid minus due: positive means they fronted money for the others. */
  difference: number;
};

/** Per person, what they paid and were due; expenses only, settlements stay in Saldi (SPEC.md §8.2, chart 3). */
export function paidDue(ctx: ChartContext): PaidDueRow[] {
  const { paid, due } = paidAndDue(ctx.trip);
  return ctx.trip.participants.map((p) => {
    const a = paid[p.id] ?? 0;
    const b = due[p.id] ?? 0;
    return { participantId: p.id, paid: a, due: b, difference: a - b };
  });
}

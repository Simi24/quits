import type { ExpenseSnapshot } from "./expense.ts";
import type { ParticipantId } from "./ids.ts";
import { resolveParticipant, effectiveExpense } from "./merge.ts";
import { splitParticipantIds } from "./split.ts";
import type { Trip } from "./trip.ts";

/** Every participant id an expense names, as payer or in its split. */
export function participantsOf(snapshot: ExpenseSnapshot): ParticipantId[] {
  return [...new Set([...snapshot.payers.map((p) => p.participantId), ...splitParticipantIds(snapshot.split)])];
}

/** In a live expense or settlement, or in a merge that stands. */
function isUsed(trip: Trip, id: ParticipantId): boolean {
  const inExpense = trip.expenses.some((e) => {
    if (e.deleted) return false;
    const { payers, split } = effectiveExpense(trip, e.snapshot);
    return participantsOf({ ...e.snapshot, payers, split }).includes(id);
  });
  const inSettlement = trip.settlements.some(
    (s) =>
      !s.deleted && (resolveParticipant(trip, s.fromParticipantId) === id || resolveParticipant(trip, s.toParticipantId) === id),
  );
  const inMerge = trip.merges.some((m) => !m.undone && (m.fromParticipantId === id || m.intoParticipantId === id));
  return inExpense || inSettlement || inMerge;
}

/** A participant can be removed only if they appear in no expense and no settlement (SPEC.md §3.3). */
export const canRemoveParticipant = (trip: Trip, id: ParticipantId): boolean =>
  trip.participants.some((p) => p.id === id) && !isUsed(trip, id);

/** The currency can change only while the trip has no expenses; deleted ones count (SPEC.md §3.2). */
export const canChangeCurrency = (trip: Trip): boolean => trip.expenses.length === 0;

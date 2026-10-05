import { resolveParticipant } from "./merge.ts";
import type { SettlementRecord, Trip } from "./trip.ts";

export type SettlementDraft = Pick<SettlementRecord, "fromParticipantId" | "toParticipantId" | "amount" | "date">;

/**
 * A live settlement with the same from, to, amount and date, merges applied: the sheet warns,
 * and still allows recording (SPEC.md §3.9).
 */
export function findDuplicateSettlement(trip: Trip, draft: SettlementDraft): SettlementRecord | undefined {
  const same = (a: string, b: string) => resolveParticipant(trip, a) === resolveParticipant(trip, b);
  return trip.settlements.find(
    (s) =>
      !s.deleted &&
      same(s.fromParticipantId, draft.fromParticipantId) &&
      same(s.toParticipantId, draft.toParticipantId) &&
      s.amount === draft.amount &&
      s.date === draft.date,
  );
}

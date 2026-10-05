import type { SettlementRecord, Trip } from "./trip.ts";

export type SettlementDraft = Pick<SettlementRecord, "fromParticipantId" | "toParticipantId" | "amount" | "date">;

/** A live settlement with the same from, to, amount and date: the sheet warns, and still allows recording (SPEC.md §3.9). */
export function findDuplicateSettlement(trip: Trip, draft: SettlementDraft): SettlementRecord | undefined {
  return trip.settlements.find(
    (s) =>
      !s.deleted &&
      s.fromParticipantId === draft.fromParticipantId &&
      s.toParticipantId === draft.toParticipantId &&
      s.amount === draft.amount &&
      s.date === draft.date,
  );
}

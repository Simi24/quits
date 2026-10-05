import type { Handlers } from "./context.ts";
import { allKnown, reviveParticipants } from "./revive.ts";

export const settlementHandlers: Handlers = {
  SettlementRecorded({ trip, afterClose, ignore }, op) {
    if (trip.settlements.some((s) => s.id === op.settlementId)) return;
    const parties = [op.fromParticipantId, op.toParticipantId];
    if (!allKnown(trip, parties)) return ignore("unknown_participant");
    reviveParticipants(trip, parties);
    trip.settlements.push({
      id: op.settlementId,
      opId: op.id,
      by: op.by,
      fromParticipantId: op.fromParticipantId,
      toParticipantId: op.toParticipantId,
      amount: op.amount,
      date: op.date,
      deleted: false,
      afterClose,
    });
  },
  SettlementDeleted({ trip, ignore }, op) {
    const record = trip.settlements.find((s) => s.id === op.settlementId);
    if (!record) return ignore("unknown_target");
    record.deleted = true;
  },
  SettlementRestored({ trip, ignore }, op) {
    const record = trip.settlements.find((s) => s.id === op.settlementId);
    if (!record) return ignore("unknown_target");
    record.deleted = false;
    reviveParticipants(trip, [record.fromParticipantId, record.toParticipantId]);
  },
};

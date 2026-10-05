import { canRemoveParticipant } from "../references.ts";
import { refreshParticipants } from "../merge.ts";
import type { Trip } from "../trip.ts";
import type { Handlers } from "./context.ts";

/**
 * Replaces the shares of a by-shares default split. Always a new object: the old one may be
 * the payload of an operation in the log, which the fold must never change.
 */
function setDefaultShares(trip: Trip, change: (shares: Record<string, number>) => Record<string, number>): void {
  if (trip.defaultSplit.method === "shares") {
    trip.defaultSplit = { method: "shares", shares: change(trip.defaultSplit.shares) };
  }
}

/** A new participant gets one share in a by-shares default split (SPEC.md §3.3). */
export function giveOneDefaultShare(trip: Trip, id: string): void {
  setDefaultShares(trip, (shares) => ({ ...shares, [id]: 1 }));
}

const isActive = (trip: Trip, id: string) =>
  trip.participants.some((p) => p.id === id);

export const participantHandlers: Handlers = {
  ParticipantAdded({ trip, ignore }, op) {
    if (trip.roster.some((r) => r.id === op.participantId)) return ignore("unknown_target");
    trip.roster.push({ id: op.participantId, name: op.name, removed: false });
    giveOneDefaultShare(trip, op.participantId);
    refreshParticipants(trip);
  },
  ParticipantRenamed({ trip, ignore }, op) {
    const entry = trip.roster.find((r) => r.id === op.participantId);
    if (!entry) return ignore("unknown_participant");
    entry.name = op.name;
    refreshParticipants(trip);
  },
  ParticipantRemoved({ trip, ignore }, op) {
    const entry = trip.roster.find((r) => r.id === op.participantId);
    if (!entry) return ignore("unknown_participant");
    if (!canRemoveParticipant(trip, op.participantId)) return ignore("participant_in_use");
    entry.removed = true;
    setDefaultShares(trip, ({ [op.participantId]: _gone, ...rest }) => rest);
    refreshParticipants(trip);
  },
  /** X into Y: every reference to X becomes Y, reversible by MergeUndone (SPEC.md §3.3). */
  ParticipantsMerged({ trip, ignore }, op) {
    const { fromParticipantId: from, intoParticipantId: into } = op;
    if (from === into || !isActive(trip, from) || !isActive(trip, into)) return ignore("invalid_merge");
    trip.merges.push({ opId: op.id, fromParticipantId: from, intoParticipantId: into, undone: false });
    refreshParticipants(trip);
  },
  MergeUndone({ trip, ignore }, op) {
    const merge = trip.merges.find((m) => m.opId === op.mergeOpId);
    if (!merge) return ignore("unknown_target");
    merge.undone = true;
    refreshParticipants(trip);
  },
};

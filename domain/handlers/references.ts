import { participantsOf } from "../references.ts";
import { refreshParticipants } from "../merge.ts";
import type { ExpenseSnapshot } from "../expense.ts";
import type { ParticipantId } from "../ids.ts";
import type { Trip } from "../trip.ts";
import { giveOneDefaultShare } from "./participants.ts";

/** True when every id is someone who entered the trip, removed or not. */
export const allKnown = (trip: Trip, ids: ParticipantId[]): boolean =>
  ids.every((id) => trip.roster.some((r) => r.id === id));

export const allKnownIn = (trip: Trip, snapshot: ExpenseSnapshot): boolean =>
  allKnown(trip, participantsOf(snapshot));

/** Something live uses a removed participant (an offline write): they are back in the trip. */
export function reviveParticipants(trip: Trip, ids: ParticipantId[]): void {
  let changed = false;
  for (const entry of trip.roster) {
    if (entry.removed && ids.includes(entry.id)) {
      entry.removed = false;
      giveOneDefaultShare(trip, entry.id);
      changed = true;
    }
  }
  if (changed) refreshParticipants(trip);
}

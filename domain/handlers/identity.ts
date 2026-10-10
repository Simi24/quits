import type { Handlers } from "./context.ts";

export const identityHandlers: Handlers = {
  /**
   * A device says it is someone else now. It only writes a history line (SPEC.md §3.17): nothing in
   * balances, totals or charts reads it. The target must be someone who is in the trip today.
   */
  IdentityChanged({ trip, ignore }, op) {
    if (!trip.participants.some((p) => p.id === op.participantId)) ignore("unknown_participant");
  },
};

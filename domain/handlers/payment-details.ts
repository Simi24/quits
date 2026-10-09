import { hasPaymentDetails } from "../payment-details.ts";
import type { Handlers } from "./context.ts";

export const paymentDetailsHandlers: Handlers = {
  /** Last writer by sequence wins, whole; an empty object clears (SPEC.md §3.16). */
  ParticipantPaymentDetailsSet({ trip, ignore }, op) {
    if (!trip.roster.some((r) => r.id === op.participantId)) return ignore("unknown_participant");
    if (hasPaymentDetails(op.details)) trip.paymentDetails = { ...trip.paymentDetails, [op.participantId]: op.details };
    else {
      const { [op.participantId]: _cleared, ...rest } = trip.paymentDetails;
      trip.paymentDetails = rest;
    }
  },
};

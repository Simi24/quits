import type { Handlers } from "./context.ts";

export const tripHandlers: Handlers = {
  TripCreated({ trip }, op) {
    trip.name = op.name;
    trip.currency = op.currency;
    trip.from = op.from;
    trip.to = op.to;
    trip.defaultSplit = op.defaultSplit;
    trip.participants = op.participants.map((p) => ({ ...p }));
  },
};

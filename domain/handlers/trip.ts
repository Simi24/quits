import { refreshParticipants } from "../merge.ts";
import type { Handlers } from "./context.ts";

export const tripHandlers: Handlers = {
  TripCreated({ trip }, op) {
    trip.name = op.name;
    trip.currency = op.currency;
    trip.from = op.from;
    trip.to = op.to;
    trip.defaultSplit = op.defaultSplit;
    trip.roster = op.participants.map((p) => ({ ...p, removed: false }));
    refreshParticipants(trip);
  },
  TripRenamed({ trip }, op) {
    trip.name = op.name;
  },
  TripDatesChanged({ trip }, op) {
    trip.from = op.from;
    trip.to = op.to;
  },
  /** Only while the trip has no expenses (SPEC.md §3.2); deleted ones count, a restore would mix currencies. */
  TripCurrencyChanged({ trip, ignore }, op) {
    if (trip.expenses.length > 0) return ignore("currency_has_expenses");
    trip.currency = op.currency;
  },
  DefaultSplitChanged({ trip }, op) {
    trip.defaultSplit = op.defaultSplit;
  },
  TripClosed({ trip }) {
    if (trip.status === "closed") return;
    trip.status = "closed";
    trip.changesAfterClose = 0;
  },
  TripReopened({ trip }) {
    trip.status = "open";
    trip.changesAfterClose = 0;
  },
  TripDeleted({ trip }) {
    trip.deleted = true;
  },
  TripRestored({ trip }) {
    trip.deleted = false;
  },
};

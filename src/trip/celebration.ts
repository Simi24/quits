import { balances } from "../../domain";
import type { Trip } from "../../domain";

/** What the trip looks like at one moment, for the PARI celebration. */
export interface EvenState {
  allEven: boolean;
  /** Every payment the fold knows, deleted ones too. */
  settlementIds: string[];
  /** Payments recorded on this device that are still in its outbox. */
  pendingSettlementIds: string[];
}

export function evenState(trip: Trip): EvenState {
  const owed = balances(trip);
  const pendingOps = new Set(trip.history.filter((entry) => entry.pending).map((entry) => entry.opId));
  return {
    allEven: trip.participants.every((p) => (owed[p.id] ?? 0) === 0),
    settlementIds: trip.settlements.map((s) => s.id),
    pendingSettlementIds: trip.settlements.filter((s) => pendingOps.has(s.opId)).map((s) => s.id),
  };
}

/**
 * The PARI celebration (SPEC.md §7.6 item 10, §7.9): due once, when a payment just recorded on this device takes the
 * trip from "someone is not even" to "everyone is even". `before` is null for the state the trip opened in. Payments
 * that arrive by sync, a payment put back after a delete and a deleted expense never celebrate.
 */
export const celebrationDue = (before: EvenState | null, now: EvenState): boolean =>
  before !== null && !before.allEven && now.allEven && now.pendingSettlementIds.some((id) => !before.settlementIds.includes(id));

import { createContext, useContext } from "react";
import type { Trip } from "../../domain";
import type { ActionResult } from "../sync";
import type { Access, Deletion, RejectedItem } from "../sync";
import type { OperationPayload } from "./build-operation";

/** What the sync line under the trip bar says (SPEC.md §5.3). */
export type SyncStatus = "local" | "syncing" | "synced" | "offline" | "error";

export interface TripValue {
  tripId: string;
  trip: Trip;
  /** The participant this device is. Empty until "chi sei?" is answered. */
  meId: string;
  /** "Chi sei?" has been answered on this device for this trip. */
  identified: boolean;
  /** The trip is closed: everything but reopening is read-only (SPEC.md §3.2). */
  readOnly: boolean;
  /** Writes one operation as the device's participant (or as `by`) and refolds the trip. */
  record: (payload: OperationPayload, by?: string) => Promise<void>;
  /** Writes several operations at once: all are stored or none is. */
  recordMany: (payloads: OperationPayload[], by?: string) => Promise<void>;
  chooseMe: (participantId: string) => Promise<void>;
  /** Formats minor units in the trip currency and the interface language. */
  money: (minor: number, options?: { signed?: boolean }) => string;
  nameOf: (participantId: string) => string;
  sync: { status: SyncStatus; pending: number };
  /** What the server last said about this trip's link and life (SPEC.md §6.4). */
  access: Access;
  deletion: Deletion | null;
  /** Operations the server refused, with the reason (SPEC.md §5.1). */
  rejected: RejectedItem[];
  /** Conflicts not yet seen on this device, by the operation that won. */
  seenConflicts: string[];
  dismissConflict: (winnerOpId: string) => Promise<void>;
  /** Server actions: online only (SPEC.md §6.2). */
  regenerateLink: () => Promise<ActionResult<{ token: string }>>;
  deleteTrip: () => Promise<ActionResult>;
  restoreTrip: () => Promise<ActionResult>;
  /** The link to share, when this device has one. */
  token: string | null;
}

export const TripContext = createContext<TripValue | null>(null);

export const useTrip = (): TripValue => {
  const value = useContext(TripContext);
  if (!value) throw new Error("useTrip needs a TripProvider");
  return value;
};

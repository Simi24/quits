import { createContext, useContext } from "react";
import type { Trip } from "../../domain";
import type { OperationPayload } from "./build-operation";

export interface TripValue {
  tripId: string;
  trip: Trip;
  /** The participant this device is. */
  meId: string;
  /** Writes one operation as the device's participant (or as `by`) and refolds the trip. */
  record: (payload: OperationPayload, by?: string) => Promise<void>;
  chooseMe: (participantId: string) => Promise<void>;
  /** Formats minor units in the trip currency and the interface language. */
  money: (minor: number, options?: { signed?: boolean }) => string;
  nameOf: (participantId: string) => string;
}

export const TripContext = createContext<TripValue | null>(null);

export const useTrip = (): TripValue => {
  const value = useContext(TripContext);
  if (!value) throw new Error("useTrip needs a TripProvider");
  return value;
};

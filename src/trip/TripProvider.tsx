import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { foldWithPending } from "../../domain";
import { appendOperations, loadTrip, setMe, updateDevice } from "../db";
import type { StoredTrip } from "../db";
import { useDevice } from "../device";
import { formatMoney } from "../format";
import { buildOperation } from "./build-operation";
import type { OperationPayload } from "./build-operation";
import { TripContext } from "./TripContext";
import type { TripValue } from "./TripContext";

interface TripProviderProps {
  tripId: string;
  /** Shown while the trip loads from IndexedDB, and when it is not on this device. */
  fallback: (state: "loading" | "missing") => ReactNode;
  children: ReactNode;
}

/**
 * Loads one trip from IndexedDB and exposes the fold of its operations (SPEC.md §9.1: the log in IndexedDB
 * plus a pure function that folds it). Every write goes to the outbox first, then the state follows.
 */
export const TripProvider = ({ tripId, fallback, children }: TripProviderProps) => {
  const { deviceId, lang } = useDevice();
  const [stored, setStored] = useState<StoredTrip | null | undefined>(undefined);

  useEffect(() => {
    let current = true;
    setStored(undefined);
    void loadTrip(tripId).then(async (loaded) => {
      if (!current) return;
      setStored(loaded ?? null);
      if (loaded) await updateDevice({ lastTripId: tripId });
    });
    return () => {
      current = false;
    };
  }, [tripId]);

  const trip = useMemo(() => (stored ? foldWithPending([], stored.operations) : null), [stored]);
  // A device that was X is Y once X is merged into Y; undoing the merge brings X back, as nothing is written until the notice is read.
  const storedMe = stored?.meta.meId ?? trip?.participants[0]?.id ?? null;
  const meId = storedMe && trip ? (trip.mergedInto[storedMe] ?? storedMe) : storedMe;
  const mergedAway = storedMe && meId && storedMe !== meId ? { fromId: storedMe, intoId: meId } : null;

  const recordMany = useCallback(
    async (payloads: OperationPayload[], by?: string) => {
      if (!stored || !meId) return;
      const operations = payloads.map((payload) => buildOperation({ by: by ?? meId, device: deviceId }, payload));
      await appendOperations(tripId, operations);
      setStored((s) => (s ? { ...s, operations: [...s.operations, ...operations] } : s));
    },
    [stored, meId, deviceId, tripId],
  );
  const record = useCallback((payload: OperationPayload, by?: string) => recordMany([payload], by), [recordMany]);

  const chooseMe = useCallback(
    async (participantId: string) => {
      await setMe(tripId, participantId);
      setStored((s) => (s ? { ...s, meta: { ...s.meta, meId: participantId } } : s));
    },
    [tripId],
  );

  const value = useMemo<TripValue | null>(() => {
    if (!trip || !meId) return null;
    return {
      tripId,
      trip,
      meId,
      record,
      recordMany,
      chooseMe,
      operations: stored?.operations ?? [],
      mergedAway,
      money: (minor, options) => formatMoney(minor, trip.currency, lang, options),
      nameOf: (id) => trip.roster.find((r) => r.id === id)?.name ?? "?",
    };
  }, [trip, meId, mergedAway?.fromId, stored?.operations, tripId, record, recordMany, chooseMe, lang]);

  if (stored === undefined) return <>{fallback("loading")}</>;
  if (!value) return <>{fallback("missing")}</>;
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
};

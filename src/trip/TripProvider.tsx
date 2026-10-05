import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { appendOperations, foldStored, loadTrip, setMe, dismissConflict, updateDevice } from "../db";
import type { StoredTrip } from "../db";
import { useDevice } from "../device";
import { formatMoney } from "../format";
import { deleteTrip, regenerateLink, restoreTrip } from "../sync";
import { api, store } from "../sync/client";
import { buildOperation } from "./build-operation";
import type { OperationPayload } from "./build-operation";
import { TripContext } from "./TripContext";
import type { TripValue } from "./TripContext";
import { useTripSync } from "./useTripSync";

interface TripProviderProps {
  tripId: string;
  /** Shown while the trip loads from IndexedDB, and when it is not on this device. */
  fallback: (state: "loading" | "missing") => ReactNode;
  children: ReactNode;
}

/**
 * Loads one trip from IndexedDB and exposes the fold of its operations (SPEC.md §9.1: the log in IndexedDB
 * plus a pure function that folds it). Every write goes to the outbox first, then the sync loop sends it.
 */
export const TripProvider = ({ tripId, fallback, children }: TripProviderProps) => {
  const { deviceId, lang } = useDevice();
  const [stored, setStored] = useState<StoredTrip | null | undefined>(undefined);

  const reload = useCallback(async () => {
    setStored((await loadTrip(tripId)) ?? null);
  }, [tripId]);

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

  const token = stored?.meta.token ?? null;
  const { syncNow, status, announce } = useTripSync({ tripId, hasToken: token !== null && stored !== null, reload });

  const trip = useMemo(() => (stored ? foldStored(stored) : null), [stored]);
  const meId = stored?.meta.meId ?? "";
  const pending = stored?.pending.length ?? 0;

  const changed = useCallback(async () => {
    await reload();
    announce(tripId);
  }, [reload, announce, tripId]);

  const recordMany = useCallback(
    async (payloads: OperationPayload[], by?: string) => {
      if (!stored || !(by ?? meId)) return;
      const operations = payloads.map((payload) => buildOperation({ by: by ?? meId, device: deviceId }, payload));
      await appendOperations(tripId, operations);
      await changed();
      void syncNow();
    },
    [stored, meId, deviceId, tripId, changed, syncNow],
  );
  const record = useCallback((payload: OperationPayload, by?: string) => recordMany([payload], by), [recordMany]);

  const chooseMe = useCallback(
    async (participantId: string) => {
      await setMe(tripId, participantId);
      await changed();
    },
    [tripId, changed],
  );

  const dismiss = useCallback(
    async (winnerOpId: string) => {
      await dismissConflict(tripId, winnerOpId);
      await reload();
    },
    [tripId, reload],
  );

  /** A server action: build its operation, send it, take in the result. */
  const serverAction = useCallback(
    async <T,>(payload: OperationPayload, run: (token: string, operation: ReturnType<typeof buildOperation>) => Promise<T>): Promise<T | { status: "error" }> => {
      const by = meId || stored?.meta.deletion?.deletedBy;
      if (!token || !by) return { status: "error" };
      const result = await run(token, buildOperation({ by, device: deviceId }, payload));
      await changed();
      return result;
    },
    [meId, stored, token, deviceId, changed],
  );

  const value = useMemo<TripValue | null>(() => {
    if (!stored || !trip) return null;
    const effectiveStatus = status === "synced" && pending > 0 ? "syncing" : status;
    return {
      tripId,
      trip,
      meId,
      identified: stored.meta.meId !== null,
      readOnly: trip.status === "closed",
      record,
      recordMany,
      chooseMe,
      money: (minor, options) => formatMoney(minor, trip.currency, lang, options),
      nameOf: (id) => trip.roster.find((r) => r.id === id)?.name ?? "?",
      sync: { status: effectiveStatus, pending },
      access: stored.meta.access,
      deletion: stored.meta.deletion,
      rejected: stored.rejected,
      seenConflicts: stored.meta.seenConflicts,
      dismissConflict: dismiss,
      regenerateLink: () => serverAction({ type: "LinkRegenerated" }, (t, operation) => regenerateLink({ api, store }, tripId, t, operation)),
      deleteTrip: () => serverAction({ type: "TripDeleted" }, (t, operation) => deleteTrip({ api, store }, tripId, t, operation)),
      restoreTrip: () => serverAction({ type: "TripRestored" }, (t, operation) => restoreTrip({ api, store }, tripId, t, operation)),
      token,
    } as TripValue;
  }, [stored, trip, tripId, meId, status, pending, record, recordMany, chooseMe, dismiss, serverAction, token, lang]);

  if (stored === undefined) return <>{fallback("loading")}</>;
  if (!value) return <>{fallback("missing")}</>;
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
};

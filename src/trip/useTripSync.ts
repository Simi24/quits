import { useCallback, useEffect, useRef, useState } from "react";
import { store, api } from "../sync/client";
import { openTabChannel, syncTrip } from "../sync";
import type { SyncOutcome } from "../sync";
import type { SyncStatus } from "./TripContext";

const POLL_MS = 30_000;

interface Options {
  tripId: string;
  hasToken: boolean;
  /** Re-reads the trip from IndexedDB. */
  reload: () => Promise<void>;
}

/**
 * Keeps one open trip in step with the server: on open, on `online`, when the tab becomes visible,
 * after every local change (`syncNow`) and every ~30 s (SPEC.md §5.3). One round at a time per tab;
 * a trigger that arrives meanwhile asks for one more round. Tabs tell each other when IndexedDB changed.
 */
export function useTripSync({ tripId, hasToken, reload }: Options) {
  const [outcome, setOutcome] = useState<SyncOutcome | null>(null);
  const running = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const announce = useRef<(id: string) => void>(() => undefined);

  const syncNow = useCallback((): Promise<void> => {
    if (running.current) {
      again.current = true;
      return running.current;
    }
    const round = (async () => {
      do {
        again.current = false;
        const result = await syncTrip({ tripId, store, api });
        setOutcome(result);
        const changed = result.status === "synced" ? result.pushed + result.rejected + result.pulled > 0 : true;
        if (changed) await reload();
        if (result.status === "synced" && changed) announce.current(tripId);
      } while (again.current);
    })().finally(() => {
      running.current = null;
    });
    running.current = round;
    return round;
  }, [tripId, reload]);

  useEffect(() => {
    const channel = openTabChannel((changed) => {
      if (changed === tripId) void reload();
    });
    announce.current = channel.announce;
    void syncNow();
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncNow();
    };
    const onOnline = () => void syncNow();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onVisible, POLL_MS);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      channel.close();
      announce.current = () => undefined;
    };
  }, [tripId, syncNow, reload]);

  // A round in flight is not shown on its own: the 30 s poll would flash the line. The provider shows
  // "syncing" while changes are waiting to go out.
  const status: SyncStatus = !hasToken
    ? "local"
    : !outcome
      ? "syncing"
      : outcome.status === "offline"
        ? "offline"
        : outcome.status === "error"
          ? "error"
          : "synced";

  // Stable, so the provider's callbacks built on it do not change on every render.
  const announceChange = useCallback((id: string) => announce.current(id), []);
  return { syncNow, status, announce: announceChange };
}

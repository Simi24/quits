import type { SyncOutcome } from "./sync-trip";

/** The one Background Sync tag: "the outbox has something to send" (SPEC.md §5.4). */
export const OUTBOX_TAG = "outbox";

interface SyncManagerLike {
  register: (tag: string) => Promise<void>;
}

/**
 * Asks the browser to wake the service worker when the network is back, where Background Sync exists
 * (Chromium; elsewhere sync only runs while the app is open, §5.3). A failure here never fails the change
 * that asked: the page's own triggers still send it.
 */
export async function registerOutboxSync(registration: { sync?: SyncManagerLike }): Promise<boolean> {
  if (!registration.sync) return false;
  try {
    await registration.sync.register(OUTBOX_TAG);
    return true;
  } catch {
    return false;
  }
}

interface PendingDeps {
  pendingTripIds: () => Promise<string[]>;
  syncOne: (tripId: string) => Promise<SyncOutcome>;
  /** Tells the open pages the trip changed in IndexedDB. */
  announce: (tripId: string) => void;
}

/** A failure the next wake-up may not repeat: no network, or a server having a bad moment. */
const mayPass = (outcome: SyncOutcome): boolean => outcome.status === "offline" || outcome.status === "error";

/**
 * What the service worker does on a `sync` event: send every trip's waiting changes. It throws when a trip
 * could not be reached, so the browser retries later (that is how Background Sync works); the answers that
 * retrying cannot change (a changed link, a deleted trip) end the task.
 */
export async function syncPendingTrips({ pendingTripIds, syncOne, announce }: PendingDeps): Promise<void> {
  let retry = false;
  for (const tripId of await pendingTripIds()) {
    const outcome = await syncOne(tripId);
    if (outcome.status === "synced") announce(tripId);
    else if (mayPass(outcome)) retry = true;
  }
  if (retry) throw new Error("Some changes could not be sent yet");
}

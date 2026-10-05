import { syncTrip } from "./sync-trip";
import type { Api, Deletion, LinkStore } from "./types";

export type LinkOutcome =
  | { status: "opened"; tripId: string; isNew: boolean }
  | { status: "deleted"; tripId: string; deletion: Deletion }
  | { status: "link_changed" | "unavailable" | "offline" | "error" };

interface OpenLinkDeps {
  token: string;
  store: LinkStore;
  api: Api;
}

/**
 * Opens a trip link (SPEC.md §5.2, "Recognising a new link"). A token the device knows opens its trip
 * offline. An unknown one is asked about once: the answer carries the `tripId`, and a trip the device
 * already has swaps in the new token and sends its queue, otherwise a new trip starts.
 */
export async function openLink({ token, store, api }: OpenLinkDeps): Promise<LinkOutcome> {
  const known = await store.findByToken(token);
  if (known) return { status: "opened", tripId: known, isNew: false };

  const answer = await api.pull(token, 0);
  switch (answer.kind) {
    case "ok": {
      const isNew = !(await store.hasTrip(answer.tripId));
      await store.adoptTrip(answer.tripId, token);
      await syncTrip({ tripId: answer.tripId, store, api });
      return { status: "opened", tripId: answer.tripId, isNew };
    }
    case "deleted":
      if (await store.hasTrip(answer.tripId)) {
        await store.adoptTrip(answer.tripId, token);
        await store.setAccess(answer.tripId, "deleted", answer.deletion);
      }
      return { status: "deleted", tripId: answer.tripId, deletion: answer.deletion };
    case "link_changed":
    case "unavailable":
    case "offline":
      return { status: answer.kind };
    default:
      return { status: "error" };
  }
}

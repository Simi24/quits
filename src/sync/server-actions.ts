import type { Operation } from "../../domain";
import { syncTrip } from "./sync-trip";
import type { Api, ApiFailure, Deletion, LinkStore } from "./types";

/** Server actions are online only (SPEC.md §6.2): offline is an answer, not a queue. */
export type ActionFailure = ApiFailure["kind"];
export type ActionResult<T = object> = ({ status: "ok" } & T) | { status: ActionFailure };

interface Deps {
  api: Api;
  store: LinkStore;
}

const failed = (failure: ApiFailure): { status: ActionFailure } => ({ status: failure.kind });

/** Creates the trip on the server, then starts it on this device as its creator and brings the log in. */
export async function createTripOnServer({ api, store }: Deps, code: string, operation: Operation): Promise<ActionResult<{ tripId: string; token: string }>> {
  const answer = await api.createTrip(code, operation);
  if (answer.kind !== "ok") return failed(answer);
  await store.adoptTrip(answer.tripId, answer.token, operation.by);
  await syncTrip({ tripId: answer.tripId, store, api });
  return { status: "ok", tripId: answer.tripId, token: answer.token };
}

/** The old link dies at once; this device takes the new token and keeps its queue (SPEC.md §4). */
export async function regenerateLink({ api, store }: Deps, tripId: string, token: string, operation: Operation): Promise<ActionResult<{ token: string }>> {
  const answer = await api.regenerateLink(token, operation);
  if (answer.kind !== "ok") return failed(answer);
  await store.adoptTrip(tripId, answer.token);
  await syncTrip({ tripId, store, api });
  return { status: "ok", token: answer.token };
}

export async function deleteTrip({ api, store }: Deps, tripId: string, token: string, operation: Operation): Promise<ActionResult<{ deletion: Deletion }>> {
  const answer = await api.deleteTrip(token, operation);
  if (answer.kind !== "ok") return failed(answer);
  const deletion: Deletion = { deletedBy: answer.deletedBy, deletedAt: answer.deletedAt, restoreUntil: answer.restoreUntil };
  await store.setAccess(tripId, "deleted", deletion);
  return { status: "ok", deletion };
}

/** Lifts the delete within 30 days. A trip kept on this device then sends everything queued while it was gone. */
export async function restoreTrip({ api, store }: Deps, tripId: string | null, token: string, operation: Operation): Promise<ActionResult> {
  const answer = await api.restoreTrip(token, operation);
  if (answer.kind !== "ok") return failed(answer);
  if (tripId && (await store.hasTrip(tripId))) {
    await store.setAccess(tripId, "ok", null);
    await syncTrip({ tripId, store, api });
  }
  return { status: "ok" };
}

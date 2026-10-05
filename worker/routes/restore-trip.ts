import { fail, json } from "../http.ts";
import { openTrip } from "../trip-access.ts";
import { readServerOperation } from "./server-operation.ts";

/** POST /api/trip/restore: the one request a deleted trip accepts. Idempotent. */
export async function restoreTrip(request: Request, env: Env): Promise<Response> {
  const opened = await openTrip(request, env);
  if (opened instanceof Response) return opened;
  const read = await readServerOperation(request, "TripRestored", { tripId: opened.tripId });
  if ("response" in read) return read.response;

  const result = await opened.trip.restoreTrip(read.operation);
  // Past the 30 days the trip is answered like a purged one (SPEC.md §6.4).
  if (result === "past_deadline") return fail(404, "trip_unavailable");
  return json({ tripId: opened.tripId, ...result });
}

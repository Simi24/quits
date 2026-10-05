import { fail, json } from "../http.ts";
import { resolveTrip } from "../trip-access.ts";
import { readServerOperation } from "./server-operation.ts";

/** POST /api/trip/restore: the one request a deleted trip accepts. Idempotent. */
export async function restoreTrip(request: Request, env: Env): Promise<Response> {
  const resolved = await resolveTrip(request, env);
  if (resolved instanceof Response) return resolved;
  const read = await readServerOperation(request, "TripRestored", { tripId: resolved.tripId });
  if ("response" in read) return read.response;

  const result = await resolved.trip.restoreTrip(read.operation);
  // Past the 30 days the trip is answered like a purged one (SPEC.md §6.4).
  if (result === "past_deadline") return fail(404, "trip_unavailable");
  return json({ tripId: resolved.tripId, ...result });
}

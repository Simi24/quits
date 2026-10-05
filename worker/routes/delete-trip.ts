import { json, tripDeleted } from "../http.ts";
import { resolveTrip } from "../trip-access.ts";
import { readServerOperation } from "./server-operation.ts";

/** POST /api/trip/delete. Deleting a trip that is already deleted answers 410 trip_deleted like any request. */
export async function deleteTrip(request: Request, env: Env): Promise<Response> {
  const resolved = await resolveTrip(request, env);
  if (resolved instanceof Response) return resolved;
  const read = await readServerOperation(request, "TripDeleted", { tripId: resolved.tripId });
  if ("response" in read) return read.response;

  const result = await resolved.trip.deleteTrip(read.operation);
  if (result.status === "deleted") return tripDeleted(resolved.tripId, result.deleted);
  return json({ tripId: resolved.tripId, ...result.value });
}

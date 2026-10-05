import { json, tripDeleted } from "../http.ts";
import { openTrip } from "../trip-access.ts";
import { readServerOperation } from "./server-operation.ts";

/** POST /api/trip/delete. Deleting a trip that is already deleted answers 410 trip_deleted like any request. */
export async function deleteTrip(request: Request, env: Env): Promise<Response> {
  const opened = await openTrip(request, env);
  if (opened instanceof Response) return opened;
  const read = await readServerOperation(request, "TripDeleted");
  if ("response" in read) return read.response;

  const result = await opened.trip.deleteTrip(read.operation);
  if (result.status === "deleted") return tripDeleted(opened.tripId, result.deleted);
  return json({ tripId: opened.tripId, ...result.value });
}

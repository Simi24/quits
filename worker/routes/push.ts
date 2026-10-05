import { fieldOf } from "../field.ts";
import { fail, json, readJson, tripDeleted } from "../http.ts";
import { resolveTrip } from "../trip-access.ts";

/** Operations per push; the client sends a longer outbox in several batches. */
export const MAX_PUSH = 100;

export async function push(request: Request, env: Env): Promise<Response> {
  const resolved = await resolveTrip(request, env);
  if (resolved instanceof Response) return resolved;
  const scope = { tripId: resolved.tripId };
  const read = await readJson(request, scope);
  if ("response" in read) return read.response;
  const operations = fieldOf(read.body, "operations");
  if (!Array.isArray(operations)) return fail(400, "bad_request", scope);
  if (operations.length > MAX_PUSH) return fail(413, "too_large", scope);

  const result = await resolved.trip.push(operations);
  if (result.status === "deleted") return tripDeleted(resolved.tripId, result.deleted);
  return json({ tripId: resolved.tripId, results: result.value });
}

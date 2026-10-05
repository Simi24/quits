import { fail, json, readJson, tripDeleted } from "../http.ts";
import { openTrip } from "../trip-access.ts";

/** Operations per push; the client sends a longer outbox in several batches. */
export const MAX_PUSH = 100;

export async function push(request: Request, env: Env): Promise<Response> {
  const opened = await openTrip(request, env);
  if (opened instanceof Response) return opened;
  const scope = { tripId: opened.tripId };
  const read = await readJson(request, scope);
  if ("response" in read) return read.response;
  const operations = typeof read.body === "object" && read.body !== null ? (read.body as { operations?: unknown }).operations : undefined;
  if (!Array.isArray(operations)) return fail(400, "bad_request", scope);
  if (operations.length > MAX_PUSH) return fail(413, "too_large", scope);

  const result = await opened.trip.push(operations);
  if (result.status === "deleted") return tripDeleted(opened.tripId, result.deleted);
  return json({ tripId: opened.tripId, results: result.value });
}

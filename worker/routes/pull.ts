import { fail, json, tripDeleted } from "../http.ts";
import { resolveTrip } from "../trip-access.ts";

export const PULL_PAGE_SIZE = 500;

export async function pull(request: Request, env: Env): Promise<Response> {
  const resolved = await resolveTrip(request, env);
  if (resolved instanceof Response) return resolved;
  const after = Number(new URL(request.url).searchParams.get("after") ?? "0");
  if (!Number.isSafeInteger(after) || after < 0) return fail(400, "bad_request", { tripId: resolved.tripId });

  const result = await resolved.trip.pull(after, PULL_PAGE_SIZE);
  if (result.status === "deleted") return tripDeleted(resolved.tripId, result.deleted);
  return json({ tripId: resolved.tripId, ...result.value });
}

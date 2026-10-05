import { fail, json, tripDeleted } from "../http.ts";
import { openTrip } from "../trip-access.ts";

export const PULL_PAGE_SIZE = 500;

export async function pull(request: Request, env: Env): Promise<Response> {
  const opened = await openTrip(request, env);
  if (opened instanceof Response) return opened;
  const after = Number(new URL(request.url).searchParams.get("after") ?? "0");
  if (!Number.isSafeInteger(after) || after < 0) return fail(400, "bad_request");

  const result = await opened.trip.pull(after, PULL_PAGE_SIZE);
  if (result.status === "deleted") return tripDeleted(opened.tripId, result.deleted);
  return json({ tripId: opened.tripId, ...result.value });
}

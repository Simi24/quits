import { fail } from "./http.ts";
import { directoryStub, tripStub } from "./jurisdiction.ts";
import { sha256Hex } from "./sha256.ts";
import { TOKEN_PATTERN } from "./tokens.ts";

export type OpenTrip = { tripId: string; tokenHash: string; trip: ReturnType<typeof tripStub> };

/**
 * Token to trip (SPEC.md §6.1): hash the bearer token, ask the Directory, and either hand back the
 * trip's Durable Object or the response to send (401 / 404 trip_unavailable / 410 link_changed).
 */
export async function openTrip(request: Request, env: Env): Promise<OpenTrip | Response> {
  const token = /^Bearer (\S+)$/.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!token || !TOKEN_PATTERN.test(token)) return fail(401, "unauthorized");
  const tokenHash = await sha256Hex(token);
  const entry = await directoryStub(env).resolve(tokenHash);
  // Unknown and purged tokens look the same: the token leads to no trip.
  if (!entry) return fail(404, "trip_unavailable");
  if (entry.state === "retired") return fail(410, "link_changed", { tripId: entry.tripId });
  return { tripId: entry.tripId, tokenHash, trip: tripStub(env, entry.tripId) };
}

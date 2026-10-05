import { directoryStub } from "../jurisdiction.ts";
import { fail, json, tripDeleted } from "../http.ts";
import { sha256Hex } from "../sha256.ts";
import { newToken } from "../tokens.ts";
import { resolveTrip } from "../trip-access.ts";
import { readServerOperation } from "./server-operation.ts";

/**
 * POST /api/trip/regenerate-link. The operation is appended first and the token rotated second: if
 * the rotation fails the old link still works and the retry finds the operation already stored,
 * whereas rotating first could strand the trip with a new token nobody received.
 */
export async function regenerateLink(request: Request, env: Env): Promise<Response> {
  const resolved = await resolveTrip(request, env);
  if (resolved instanceof Response) return resolved;
  const read = await readServerOperation(request, "LinkRegenerated", { tripId: resolved.tripId });
  if ("response" in read) return read.response;

  const recorded = await resolved.trip.recordLinkRegeneration(read.operation);
  if (recorded.status === "deleted") return tripDeleted(resolved.tripId, recorded.deleted);

  const token = newToken();
  const rotated = await directoryStub(env).rotate(resolved.tokenHash, await sha256Hex(token));
  // Someone regenerated at the same moment: this token is already the old link.
  if (!rotated) return fail(410, "link_changed", { tripId: resolved.tripId });
  return json({ tripId: resolved.tripId, token, seq: recorded.value });
}

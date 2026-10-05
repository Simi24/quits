import { directoryStub, tripStub } from "../jurisdiction.ts";
import { fail, json } from "../http.ts";
import { sha256Hex } from "../sha256.ts";
import { newToken } from "../tokens.ts";
import { creatorLabel } from "./creator-check.ts";
import { readServerOperation } from "./server-operation.ts";

/** POST /api/trips: the Worker makes the tripId and the token, starts the trip and registers the token. */
export async function createTrip(request: Request, env: Env): Promise<Response> {
  const label = await creatorLabel(request, env);
  if (label === null) return fail(403, "invalid_creator_code");
  const read = await readServerOperation(request, "TripCreated");
  if ("response" in read) return read.response;

  const tripId = crypto.randomUUID();
  const token = newToken();
  const seq = await tripStub(env, tripId).init(tripId, label, read.operation);
  await directoryStub(env).register(await sha256Hex(token), tripId);
  return json({ tripId, token, seq }, 201);
}

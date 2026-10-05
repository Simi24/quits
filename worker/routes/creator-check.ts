import { creatorLabel } from "../authorization.ts";
import { fail, json } from "../http.ts";

export async function creatorCheck(request: Request, env: Env): Promise<Response> {
  if ((await creatorLabel(request, env)) === null) return fail(403, "invalid_creator_code");
  return json({ ok: true });
}

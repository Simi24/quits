import { labelOfCode } from "../creator-codes.ts";
import { fail, json } from "../http.ts";

/** The label of the creator code in `Authorization: Creator <code>`, or null. */
export async function creatorLabel(request: Request, env: Env): Promise<string | null> {
  const code = /^Creator (\S+)$/.exec(request.headers.get("Authorization") ?? "")?.[1];
  return code ? labelOfCode(code, env.CREATOR_CODES) : null;
}

export async function creatorCheck(request: Request, env: Env): Promise<Response> {
  if ((await creatorLabel(request, env)) === null) return fail(403, "invalid_creator_code");
  return json({ ok: true });
}

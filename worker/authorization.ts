import { labelOfCode } from "./creator-codes.ts";

const SCHEMES = { Bearer: /^Bearer (\S+)$/, Creator: /^Creator (\S+)$/ };

/**
 * The credential of `Authorization: <scheme> <credential>` (SPEC.md §6.1): `Bearer` carries a trip
 * token, `Creator` a creator code. Undefined when the header is missing or of another scheme.
 */
export function credential(request: Request, scheme: keyof typeof SCHEMES): string | undefined {
  return SCHEMES[scheme].exec(request.headers.get("Authorization") ?? "")?.[1];
}

/** The label of the creator code in `Authorization: Creator <code>`, or null. */
export async function creatorLabel(request: Request, env: Env): Promise<string | null> {
  const code = credential(request, "Creator");
  return code ? labelOfCode(code, env.CREATOR_CODES) : null;
}

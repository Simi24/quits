import { z } from "zod";
import { sha256Hex } from "./sha256.ts";

/** Shared by the Worker and `scripts/creator-codes.ts`: the shape of the `CREATOR_CODES` secret (SPEC.md §4). */
export const creatorCodesSchema = z.array(z.strictObject({ label: z.string().min(1), hash: z.string().regex(/^[0-9a-f]{64}$/) }));
export type CreatorCodeEntry = z.infer<typeof creatorCodesSchema>[number];

/** Crockford base32 is case-insensitive and people type codes by hand, so the hash is of the normalised code. */
export const normaliseCode = (code: string) => code.trim().toUpperCase();

export const hashCode = (code: string) => sha256Hex(normaliseCode(code));

/** The label of the person a code belongs to, or null when the code is wrong or was revoked. */
export async function labelOfCode(code: string, secret: string | undefined): Promise<string | null> {
  if (secret === undefined) return null; // a Worker deployed before the secret is set: the list is empty
  const entries = creatorCodesSchema.parse(JSON.parse(secret));
  const hash = await hashCode(code);
  return entries.find((entry) => entry.hash === hash)?.label ?? null;
}

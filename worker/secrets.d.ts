// Worker secrets are not in wrangler.jsonc, so `wrangler types` cannot see them (SPEC.md §11.5).
interface Env {
  /** JSON of `{ label, hash }`: the creator codes' SHA-256 hashes, written by scripts/creator-codes.ts. */
  CREATOR_CODES: string;
}

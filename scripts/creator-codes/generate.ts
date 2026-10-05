/** Crockford base32: no I, L, O or U (SPEC.md §4). */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** `q-` and 20 base32 characters: 100 random bits. 256 is a multiple of 32, so masking a byte is unbiased. */
export function newCreatorCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return `q-${[...bytes].map((byte) => ALPHABET[byte & 31]).join("")}`;
}

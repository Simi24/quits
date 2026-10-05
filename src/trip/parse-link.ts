/** A trip token: 22 characters of base64url (SPEC.md §4). */
const TOKEN = /^[A-Za-z0-9_-]{22}$/;

/**
 * The token in whatever a person pastes: a full trip link (`/v/#<token>`, any host) or the bare token.
 * Null when it is neither, so the field can say so instead of opening nothing.
 */
export function tokenFromInput(input: string): string | null {
  const text = input.trim();
  if (TOKEN.test(text)) return text;
  const hash = text.indexOf("#");
  if (hash < 0) return null;
  const path = text.slice(0, hash).replace(/^[a-z]+:\/\//i, "");
  if (!/(^|\/)v\/?$/.test(path)) return null;
  const token = text.slice(hash + 1);
  return TOKEN.test(token) ? token : null;
}

/** 128 random bits as base64url: 22 characters (SPEC.md §4). */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

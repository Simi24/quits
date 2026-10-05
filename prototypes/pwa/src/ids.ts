// 128-bit random token as base64url (22 chars), like the real trip link (issue #6).
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Accepts "#tok", "tok" or a full ".../v/#tok" link.
export function tokenFrom(input: string): string | null {
  const raw = input.includes('#') ? input.slice(input.indexOf('#') + 1) : input;
  const token = raw.trim();
  return /^[A-Za-z0-9_-]{4,64}$/.test(token) ? token : null;
}

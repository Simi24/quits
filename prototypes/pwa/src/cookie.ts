// First-party cookie mirror of token + identity + device id.
// iOS copies Safari's cookies (not IndexedDB) into a Home Screen app at install time.
// Path=/v/ keeps it off /assets/, /sw.js and /api/ requests; note Safari caps
// script-written cookies to 7 days whatever Max-Age says (ITP).
export const COOKIE_NAME = 'quits_proto';
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export type CookieMirror = { t: string; n: string | null; d: string };

export function writeCookie(value: CookieMirror): void {
  const encoded = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${COOKIE_NAME}=${encoded}; Path=/v/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax; Secure`;
}

export function clearCookie(): void {
  document.cookie = `${COOKIE_NAME}=; Path=/v/; Max-Age=0; SameSite=Lax; Secure`;
}

export function readCookie(): CookieMirror | null {
  const pair = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!pair) return null;
  try {
    return JSON.parse(decodeURIComponent(pair.slice(COOKIE_NAME.length + 1))) as CookieMirror;
  } catch {
    return null;
  }
}

type CookieStoreLike = { get(name: string): Promise<{ expires?: number | null } | null> };

// Cookie Store API (Chromium, recent Safari) exposes the real expiry, so the ITP cap is visible.
export async function readCookieExpiry(): Promise<string> {
  const store = (globalThis as { cookieStore?: CookieStoreLike }).cookieStore;
  if (!store) return 'n/d (Cookie Store API assente)';
  const c = await store.get(COOKIE_NAME);
  if (!c) return 'nessun cookie';
  return c.expires ? new Date(c.expires).toISOString() : 'sessione';
}

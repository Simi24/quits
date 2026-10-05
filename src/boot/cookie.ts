import { decodeBridge, encodeBridge } from "./cookie-bridge";
import type { Bridge } from "./cookie-bridge";

const NAME = "quits_bridge";
// 400 days is the most a browser keeps; Safari caps a cookie written by script at 7 days whatever this says (SPEC.md §5.5).
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function readBridgeCookie(): Bridge | null {
  const pair = document.cookie.split("; ").find((c) => c.startsWith(`${NAME}=`));
  return pair ? decodeBridge(pair.slice(NAME.length + 1)) : null;
}

/** `Path=/v/` keeps it off the static assets and `/api/`; it travels only to the trip pages (SPEC.md §5.5). */
export function writeBridgeCookie(bridge: Bridge): void {
  document.cookie = `${NAME}=${encodeBridge(bridge)}; Path=/v/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax; Secure`;
}

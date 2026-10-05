/** Cloudflare Web Analytics, cookieless (SPEC.md §10.1). The script is Cloudflare's, never part of our bundle. */
export const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

/** Only the bare landing measures visits: a trip page (`/v/...`) and `/privacy` never do. */
export const isLandingPath = (pathname: string): boolean => pathname === "/";

/** Adds the beacon to the page and returns what removes it again. */
export const mountBeacon = (doc: Document, token: string): (() => void) => {
  const script = doc.createElement("script");
  script.defer = true;
  script.src = BEACON_SRC;
  script.dataset.cfBeacon = JSON.stringify({ token });
  doc.head.append(script);
  return () => script.remove();
};

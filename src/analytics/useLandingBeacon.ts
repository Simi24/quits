import { useEffect } from "react";
import { isLandingPath, mountBeacon } from "./beacon";

/** Set at build from the GitHub variable `CF_BEACON_TOKEN` (SPEC.md §10.1). Public by nature; empty means no analytics. */
const TOKEN = (import.meta.env.VITE_CF_BEACON_TOKEN as string | undefined)?.trim() ?? "";

/** Measures visits while the landing is on screen: leaving it for a trip or another screen takes the beacon off. */
export const useLandingBeacon = (): void => {
  useEffect(() => {
    if (!TOKEN || !isLandingPath(window.location.pathname)) return undefined;
    return mountBeacon(document, TOKEN);
  }, []);
};

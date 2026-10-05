import { onTripsChanged, snapshotBridge } from "../db";
import { writeBridgeCookie } from "./cookie";

/**
 * Keeps the cookie bridge equal to IndexedDB: an installed iOS app gets a copy of the cookies at the moment
 * of installation, so it must always be current (SPEC.md §5.5). Returns what stops it.
 */
export function mirrorBridge(): () => void {
  const write = () => void snapshotBridge().then(writeBridgeCookie);
  write();
  return onTripsChanged(write);
}

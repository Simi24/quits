import { onTripsChanged, readDevice, tripRecords } from "../db";
import { isIos } from "../pwa";
import { bridgeFrom } from "./bridge-from";
import type { Bridge } from "./cookie-bridge";
import { writeBridgeCookie } from "./cookie";

/** The bridge as IndexedDB says it should be right now. */
const snapshotBridge = async (): Promise<Bridge> => {
  const [device, trips] = await Promise.all([readDevice(), tripRecords()]);
  return bridgeFrom(device.deviceId, trips);
};

/**
 * Keeps the cookie bridge equal to IndexedDB: an installed iOS app gets a copy of the cookies at the moment
 * of installation, so it must always be current (SPEC.md §5.5). Returns what stops it.
 *
 * Only on iOS: anywhere else the token stays out of cookies (AGENTS.md). And never with no trip in it: a start
 * outside `/v/` cannot read the bridge, so an empty IndexedDB there must not erase the trips it carries.
 */
export function mirrorBridge(): () => void {
  if (!isIos(navigator.userAgent, navigator.maxTouchPoints)) return () => undefined;
  const write = () =>
    void snapshotBridge().then((bridge) => {
      if (bridge.trips.length > 0) writeBridgeCookie(bridge);
    });
  write();
  return onTripsChanged(write);
}

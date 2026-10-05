import { describe, expect, it } from "vitest";
import { BRIDGE_LIMIT, decodeBridge, encodeBridge } from "./cookie-bridge";
import type { BridgeEntry } from "./cookie-bridge";

const entry = (n: number, participantId: string | null = `participant-${n}`): BridgeEntry => ({
  tripId: `trip-${n}`,
  token: `token-${n}`,
  participantId,
});

describe("the cookie bridge", () => {
  it("gives back the device id and the trips it was given, most recent first", () => {
    const value = { deviceId: "device-1", trips: [entry(1), entry(2, null)] };
    expect(decodeBridge(encodeBridge(value))).toEqual(value);
  });

  it("keeps only the 10 most recent trips", () => {
    const trips = Array.from({ length: 13 }, (_, i) => entry(i + 1));
    const decoded = decodeBridge(encodeBridge({ deviceId: "d", trips }));
    expect(decoded?.trips).toHaveLength(BRIDGE_LIMIT);
    expect(decoded?.trips.map((t) => t.tripId)).toEqual(trips.slice(0, 10).map((t) => t.tripId));
  });

  it("stays under the 4 KB a cookie may hold with ten trips of real size", () => {
    const uuid = (n: number) => `${String(n).padStart(8, "0")}-aaaa-4bbb-8ccc-dddddddddddd`;
    const trips = Array.from({ length: 10 }, (_, i) => ({ tripId: uuid(i), token: "A".repeat(22), participantId: uuid(i + 100) }));
    const cookie = `quits_bridge=${encodeBridge({ deviceId: uuid(999), trips })}; Path=/v/; Max-Age=34560000; SameSite=Lax; Secure`;
    expect(cookie.length).toBeLessThan(4096);
  });

  it.each([
    ["nothing", ""],
    ["text that is not JSON", "%7Bnot"],
    ["a different shape", encodeURIComponent(JSON.stringify({ hello: "world" }))],
    ["a device id that is not text", encodeURIComponent(JSON.stringify({ v: 1, d: 7, t: [] }))],
  ])("reads %s as no bridge", (_label, raw) => {
    expect(decodeBridge(raw)).toBeNull();
  });

  it("keeps the device id even when no trip is readable", () => {
    const raw = encodeURIComponent(JSON.stringify({ v: 1, d: "x", t: [[1, 2, 3]] }));
    expect(decodeBridge(raw)).toEqual({ deviceId: "x", trips: [] });
  });

  it("drops a damaged trip and keeps the others", () => {
    const raw = encodeURIComponent(JSON.stringify({ v: 1, d: "d", t: [["trip-1", "token-1", null], ["broken"], ["trip-2", "token-2", "p"]] }));
    expect(decodeBridge(raw)?.trips.map((t) => t.tripId)).toEqual(["trip-1", "trip-2"]);
  });
});

import { describe, expect, it } from "vitest";
import type { Bridge } from "./cookie-bridge";
import { planBoot } from "./plan-boot";
import type { BootInput } from "./plan-boot";

const bridge: Bridge = {
  deviceId: "device-from-cookie",
  trips: [
    { tripId: "trip-b", token: "token-b", participantId: "p1" },
    { tripId: "trip-a", token: "token-a", participantId: null },
  ],
};

const base: BootInput = { fragmentToken: "", fromApp: false, storedTripIds: [], lastTripId: null, bridge: null };

describe("the boot order: link fragment, then IndexedDB, then the cookie bridge", () => {
  it("opens the link in the address bar before anything else", () => {
    const plan = planBoot({ ...base, fragmentToken: "token-x", storedTripIds: ["trip-a"], lastTripId: "trip-a", bridge });
    expect(plan.open).toEqual({ kind: "link", token: "token-x" });
  });

  it("opens the trip the app was left on, when IndexedDB has trips", () => {
    const plan = planBoot({ ...base, storedTripIds: ["trip-a", "trip-b"], lastTripId: "trip-b" });
    expect(plan.open).toEqual({ kind: "trip", tripId: "trip-b" });
    expect(plan.restore).toEqual([]);
  });

  it("shows the landing when the app was left there", () => {
    expect(planBoot({ ...base, storedTripIds: ["trip-a"], lastTripId: null }).open).toEqual({ kind: "landing" });
  });

  it("started from the installed app, opens the most recently used trip even after the landing was left open", () => {
    const plan = planBoot({ ...base, fromApp: true, storedTripIds: ["trip-b", "trip-a"], lastTripId: null });
    expect(plan.open).toEqual({ kind: "trip", tripId: "trip-b" });
  });

  it("ignores a last trip that is no longer on the device", () => {
    expect(planBoot({ ...base, storedTripIds: ["trip-a"], lastTripId: "gone" }).open).toEqual({ kind: "landing" });
  });

  it("with IndexedDB empty and the bridge present, restores every trip it lists and opens the most recent", () => {
    const plan = planBoot({ ...base, bridge });
    expect(plan.restore).toEqual(bridge.trips);
    expect(plan.deviceId).toBe("device-from-cookie");
    expect(plan.open).toEqual({ kind: "trip", tripId: "trip-b" });
  });

  it("restores the bridge even when a link is opened, so the other trips are not lost", () => {
    const plan = planBoot({ ...base, fragmentToken: "token-x", bridge });
    expect(plan.open).toEqual({ kind: "link", token: "token-x" });
    expect(plan.restore).toEqual(bridge.trips);
  });

  it("never restores over trips IndexedDB already has", () => {
    const plan = planBoot({ ...base, storedTripIds: ["trip-a"], bridge });
    expect(plan.restore).toEqual([]);
    expect(plan.deviceId).toBeNull();
  });

  it("starts at the landing with nothing anywhere", () => {
    expect(planBoot(base)).toEqual({ open: { kind: "landing" }, restore: [], deviceId: null });
  });

  it("keeps the device id of an empty bridge", () => {
    const plan = planBoot({ ...base, bridge: { deviceId: "d", trips: [] } });
    expect(plan.deviceId).toBe("d");
    expect(plan.open).toEqual({ kind: "landing" });
  });
});

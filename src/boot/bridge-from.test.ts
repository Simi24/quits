import { describe, expect, it } from "vitest";
import { bridgeFrom } from "./bridge-from";

const meta = (tripId: string, lastUsedAt: string, token: string | null = `token-${tripId}`, meId: string | null = null) => ({ tripId, token, meId, lastUsedAt });

describe("what the bridge mirrors", () => {
  it("lists the trips most recently used first, with who this device is in each", () => {
    const bridge = bridgeFrom("device-1", [meta("a", "2026-07-01T10:00:00Z", "ta", "p1"), meta("b", "2026-07-03T10:00:00Z", "tb")]);
    expect(bridge).toEqual({
      deviceId: "device-1",
      trips: [
        { tripId: "b", token: "tb", participantId: null },
        { tripId: "a", token: "ta", participantId: "p1" },
      ],
    });
  });

  it("leaves out a trip that has no link: it lives on this device only", () => {
    expect(bridgeFrom("d", [meta("local", "2026-07-01T10:00:00Z", null), meta("linked", "2026-06-01T10:00:00Z")]).trips.map((t) => t.tripId)).toEqual(["linked"]);
  });

  it("keeps the ten most recent", () => {
    const metas = Array.from({ length: 12 }, (_, i) => meta(`t${i}`, `2026-07-${String(i + 1).padStart(2, "0")}T10:00:00Z`));
    const bridge = bridgeFrom("d", metas);
    expect(bridge.trips).toHaveLength(10);
    expect(bridge.trips[0]?.tripId).toBe("t11");
    expect(bridge.trips.at(-1)?.tripId).toBe("t2");
  });
});

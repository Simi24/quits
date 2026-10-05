import { describe, expect, it } from "vitest";
import { firstTipVisible } from "./first-tip";

describe("the first-use tip next to the + button", () => {
  it("shows on a trip opened for the first time on this device", () => {
    expect(firstTipVisible({ tipSeen: false, readOnly: false })).toBe(true);
  });

  it("never shows again once it was dismissed or the first expense was recorded", () => {
    expect(firstTipVisible({ tipSeen: true, readOnly: false })).toBe(false);
  });

  it("does not show on a closed trip, which has no + button", () => {
    expect(firstTipVisible({ tipSeen: false, readOnly: true })).toBe(false);
  });
});

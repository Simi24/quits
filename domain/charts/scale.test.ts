import { describe, expect, it } from "vitest";
import { axisTicks, niceStep } from "./scale.ts";

describe("niceStep", () => {
  it("picks the smallest 1, 2, 2.5, 5 or 10 times a power of ten that fits the data in n steps", () => {
    expect(niceStep(456_518, 3)).toBe(200_000);
    expect(niceStep(100, 4)).toBe(25);
    expect(niceStep(0, 4)).toBe(1);
  });

  it("never returns less than one minor unit", () => {
    expect(niceStep(2, 4)).toBe(1);
  });
});

describe("axisTicks", () => {
  it("starts at zero and ends on a multiple of the step above the data", () => {
    expect(axisTicks(0, 456_518, 3)).toEqual({ ticks: [0, 200_000, 400_000, 600_000], min: 0, max: 600_000 });
  });

  it("reaches below zero when a refund pulls a column under it", () => {
    const { ticks, min, max } = axisTicks(-30_000, 100_000, 3);
    expect(min).toBeLessThanOrEqual(-30_000);
    expect(max).toBeGreaterThanOrEqual(100_000);
    expect(ticks).toContain(0);
    expect(ticks[0]).toBe(min);
    expect(ticks.at(-1)).toBe(max);
  });

  it("gives an empty chart a scale anyway", () => {
    expect(axisTicks(0, 0, 3).ticks).toEqual([0, 1]);
  });
});

import { describe, expect, it } from "vitest";
import { splitExpense } from "./index.ts";

const order = ["p1", "p2", "p3", "p4", "p5"];

describe("splitExpense", () => {
  it("gives the leftover cent of an equal split to the first participant in order of entry", () => {
    const { shares, leftover } = splitExpense(
      100,
      { method: "equal", among: ["p1", "p2", "p3"] },
      order,
    );
    expect(shares).toEqual({ p1: 34, p2: 33, p3: 33 });
    expect(leftover).toEqual(["p1"]);
  });

  it("breaks ties by order of entry, not by the order of the subset", () => {
    const { shares, leftover } = splitExpense(
      100,
      { method: "equal", among: ["p3", "p1", "p2"] },
      order,
    );
    expect(shares).toEqual({ p1: 34, p2: 33, p3: 33 });
    expect(leftover).toEqual(["p1"]);
  });

  it("gives leftover cents to the largest remainders first (shares)", () => {
    // Prototype "Noleggio auto": 39200 over weights 1,1,2,1,1 leaves 2 cents: p3 (largest remainder), then p1.
    const { shares, leftover } = splitExpense(
      39200,
      { method: "shares", shares: { p1: 1, p2: 1, p3: 2, p4: 1, p5: 1 } },
      order,
    );
    expect(shares).toEqual({ p1: 6534, p2: 6533, p3: 13067, p4: 6533, p5: 6533 });
    expect(leftover).toEqual(["p3", "p1"]);
  });

  it("splits by percentages with two decimals", () => {
    // Prototype "Cena di pesce".
    const { shares, leftover } = splitExpense(
      24730,
      { method: "percentage", percentages: { p1: 15, p2: 15, p3: 35, p4: 20, p5: 15 } },
      order,
    );
    expect(shares).toEqual({ p1: 3710, p2: 3710, p3: 8655, p4: 4946, p5: 3709 });
    expect(leftover).toEqual(["p1", "p2"]);
    const fine = splitExpense(
      1000,
      { method: "percentage", percentages: { p1: 33.33, p2: 33.33, p3: 33.34 } },
      order,
    );
    expect(fine.shares).toEqual({ p1: 333, p2: 333, p3: 334 });
  });

  it("uses exact amounts as they are, with no leftover", () => {
    const { shares, leftover } = splitExpense(
      9640,
      { method: "exact", amounts: { p1: 1820, p2: 1500, p3: 3370, p4: 1650, p5: 1300 } },
      order,
    );
    expect(shares).toEqual({ p1: 1820, p2: 1500, p3: 3370, p4: 1650, p5: 1300 });
    expect(leftover).toEqual([]);
  });

  it("carries the sign of a refund", () => {
    const { shares } = splitExpense(
      -30000,
      { method: "shares", shares: { p1: 1, p2: 1, p3: 2, p4: 1, p5: 1 } },
      order,
    );
    expect(shares).toEqual({ p1: -5000, p2: -5000, p3: -10000, p4: -5000, p5: -5000 });
    const exact = splitExpense(-300, { method: "exact", amounts: { p1: 100, p2: 200 } }, order);
    expect(exact.shares).toEqual({ p1: -100, p2: -200 });
  });

  it("leaves out participants with zero weight", () => {
    const { shares } = splitExpense(
      900,
      { method: "shares", shares: { p1: 0, p2: 1, p3: 2 } },
      order,
    );
    expect(shares).toEqual({ p2: 300, p3: 600 });
  });
});

import { describe, expect, it } from "vitest";
import { validateExpense, type ExpenseSnapshot } from "./index.ts";

const valid: ExpenseSnapshot = {
  description: "Cena",
  amount: 9000,
  date: "2026-06-14",
  categoryId: "restaurants",
  payers: [{ participantId: "p1", amount: 9000 }],
  split: { method: "equal", among: ["p1", "p2"] },
};

const codes = (e: ExpenseSnapshot) => validateExpense(e).map((i) => i.code);

describe("validateExpense", () => {
  it("accepts a well-formed expense", () => {
    expect(validateExpense(valid)).toEqual([]);
  });

  it("requires a description", () => {
    expect(codes({ ...valid, description: "   " })).toEqual(["description_missing"]);
  });

  it("requires a non-zero amount", () => {
    expect(codes({ ...valid, amount: 0, payers: [] })).toContain("amount_zero");
  });

  it("requires payers to sum to the amount and says by how much", () => {
    expect(validateExpense({ ...valid, payers: [{ participantId: "p1", amount: 8000 }] })).toEqual([
      { code: "payers_short", missing: 1000 },
    ]);
    expect(validateExpense({ ...valid, payers: [{ participantId: "p1", amount: 9500 }] })).toEqual([
      { code: "payers_over", excess: 500 },
    ]);
  });

  it("equal split needs at least one person", () => {
    expect(codes({ ...valid, split: { method: "equal", among: [] } })).toEqual(["split_nobody"]);
  });

  it("exact amounts must sum to the expense amount", () => {
    expect(
      validateExpense({ ...valid, split: { method: "exact", amounts: { p1: 4000, p2: 4000 } } }),
    ).toEqual([{ code: "exact_missing", missing: 1000 }]);
    expect(
      validateExpense({ ...valid, split: { method: "exact", amounts: { p1: 5000, p2: 5000 } } }),
    ).toEqual([{ code: "exact_excess", excess: 1000 }]);
  });

  it("percentages must make exactly 100", () => {
    expect(
      validateExpense({ ...valid, split: { method: "percentage", percentages: { p1: 50, p2: 40.5 } } }),
    ).toEqual([{ code: "percentage_total", total: 90.5 }]);
    expect(
      validateExpense({ ...valid, split: { method: "percentage", percentages: { p1: 33.33, p2: 33.33, p3: 33.34 } } }),
    ).toEqual([]);
  });

  it("shares need at least one share in total", () => {
    expect(codes({ ...valid, split: { method: "shares", shares: { p1: 0, p2: 0 } } })).toEqual([
      "split_nobody",
    ]);
  });

  it("validates a refund by its absolute amount", () => {
    expect(
      validateExpense({
        ...valid,
        amount: -3000,
        payers: [{ participantId: "p1", amount: -3000 }],
        split: { method: "exact", amounts: { p1: 1000, p2: 2000 } },
      }),
    ).toEqual([]);
  });

  it("rejects non-integer money", () => {
    expect(codes({ ...valid, amount: 10.5 })).toContain("amount_not_integer");
  });
});

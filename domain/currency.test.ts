import { describe, expect, it } from "vitest";
import { canChangeCurrency, foldWithPending } from "./index.ts";
import { expenseCreated, op, tripCreated } from "./testing.ts";

describe("canChangeCurrency", () => {
  it("is open while the trip has no expenses", () => {
    expect(canChangeCurrency(foldWithPending([], [tripCreated()]))).toBe(true);
  });

  it("closes with the first expense, and a deleted one still counts", () => {
    const ops = [tripCreated(), expenseCreated("e1")];
    expect(canChangeCurrency(foldWithPending([], ops))).toBe(false);
    expect(canChangeCurrency(foldWithPending([], [...ops, op({ type: "ExpenseDeleted", expenseId: "e1" })]))).toBe(false);
  });

  it("agrees with the fold: the change it allows is applied, the one it refuses is ignored", () => {
    const change = op({ type: "TripCurrencyChanged", currency: "USD" });
    expect(foldWithPending([], [tripCreated(), change]).currency).toBe("USD");
    expect(foldWithPending([], [tripCreated(), expenseCreated("e1"), change]).currency).toBe("EUR");
  });
});

import { describe, expect, it } from "vitest";
import { foldTrip } from "./index.ts";
import { expense, expenseCreated, op, sequence, tripCreated } from "./testing.ts";

const fold = (...ops: ReturnType<typeof op>[]) => foldTrip(sequence([tripCreated(), ...ops]));

describe("trip edits", () => {
  it("renames, changes dates (either may be empty) and the default split", () => {
    const trip = fold(
      op({ type: "TripRenamed", name: "Corsica" }),
      op({ type: "TripDatesChanged", from: "2026-07-01", to: null }),
      op({ type: "DefaultSplitChanged", defaultSplit: { method: "shares", shares: { p1: 1, p2: 1, p3: 2 } } }),
    );
    expect(trip).toMatchObject({
      name: "Corsica",
      from: "2026-07-01",
      to: null,
      defaultSplit: { method: "shares", shares: { p1: 1, p2: 1, p3: 2 } },
    });
  });

  it("changes the currency while the trip has no expenses", () => {
    const trip = fold(op({ type: "TripCurrencyChanged", currency: "JPY" }));
    expect(trip.currency).toBe("JPY");
  });

  it("ignores a late currency change and says why in the history", () => {
    const change = op({ type: "TripCurrencyChanged", currency: "USD" }, { id: "late-currency" });
    const trip = fold(expenseCreated("e1"), change);
    expect(trip.currency).toBe("EUR");
    expect(trip.history.find((h) => h.opId === "late-currency")?.ignored).toBe("currency_has_expenses");
  });

  it("keeps ignoring the currency change even if the only expense was deleted", () => {
    const trip = fold(expenseCreated("e1"), op({ type: "ExpenseDeleted", expenseId: "e1" }), op({ type: "TripCurrencyChanged", currency: "USD" }));
    expect(trip.currency).toBe("EUR");
  });
});

describe("closing", () => {
  it("closes and reopens", () => {
    expect(fold(op({ type: "TripClosed" })).status).toBe("closed");
    expect(fold(op({ type: "TripClosed" }), op({ type: "TripReopened" })).status).toBe("open");
  });

  it("applies operations sequenced after the close and flags them", () => {
    const late = expenseCreated("e1", expense(), { id: "late" });
    const trip = fold(op({ type: "TripClosed" }), late);
    expect(trip.expenses).toHaveLength(1);
    expect(trip.history.find((h) => h.opId === "late")?.afterClose).toBe(true);
    expect(trip.expenses[0]?.versions[0]?.afterClose).toBe(true);
    expect(trip.changesAfterClose).toBe(1);
  });

  it("does not flag the close itself nor what comes after the reopening", () => {
    const trip = fold(op({ type: "TripClosed" }, { id: "close" }), op({ type: "TripReopened" }, { id: "reopen" }), expenseCreated("e1"));
    expect(trip.history.some((h) => h.afterClose)).toBe(false);
    expect(trip.changesAfterClose).toBe(0);
  });

  it("starts counting again after a new close", () => {
    const trip = fold(
      op({ type: "TripClosed" }),
      expenseCreated("e1"),
      op({ type: "TripReopened" }),
      op({ type: "TripClosed" }),
    );
    expect(trip.changesAfterClose).toBe(0);
  });
});

describe("server actions", () => {
  it("marks the trip deleted and restored, and the link regeneration is just history", () => {
    expect(fold(op({ type: "TripDeleted" })).deleted).toBe(true);
    expect(fold(op({ type: "TripDeleted" }), op({ type: "TripRestored" })).deleted).toBe(false);
    const trip = fold(op({ type: "LinkRegenerated" }, { id: "regen" }));
    expect(trip.history.at(-1)).toMatchObject({ opId: "regen", type: "LinkRegenerated", ignored: null });
  });
});

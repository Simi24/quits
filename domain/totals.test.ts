import { describe, expect, it } from "vitest";
import { foldTrip, tripTotals } from "./index.ts";
import { expense, expenseCreated, op, sequence, tripCreated } from "./testing.ts";

const fold = (extra: Record<string, unknown>, ...ops: ReturnType<typeof op>[]) =>
  foldTrip(sequence([tripCreated(extra), ...ops]));
const spend = (id: string, amount: number, date: string, categoryId = "restaurants") =>
  expenseCreated(id, expense({ amount, date, categoryId, payers: [{ participantId: "p1", amount }] }));

describe("tripTotals", () => {
  it("sums live expenses, refunds as negatives, and divides by the trip days and the heads", () => {
    // 8 days (13 to 20 June, inclusive), 3 participants in an equal default split.
    const trip = fold({}, spend("e1", 100000, "2026-06-13"), spend("e2", -4000, "2026-06-14"), spend("e3", 99999, "2026-06-15"), op({ type: "ExpenseDeleted", expenseId: "e3" }));
    expect(tripTotals(trip)).toMatchObject({ total: 96000, days: 8, heads: 3, perDay: 12000, perPersonPerDay: 4000 });
  });

  it("rounds the per-day figures to the minor unit", () => {
    const trip = fold({}, spend("e1", 1000, "2026-06-13"));
    // 1000 / 8 = 125 ; 125 / 3 = 41.67
    expect(tripTotals(trip)).toMatchObject({ perDay: 125, perPersonPerDay: 42 });
  });

  it("counts heads as the sum of the shares of the default split, a couple counting two", () => {
    const trip = fold({ defaultSplit: { method: "shares", shares: { p1: 1, p2: 1, p3: 2 } } }, spend("e1", 1000, "2026-06-13"));
    expect(tripTotals(trip).heads).toBe(4);
  });

  it("adds the shares of a merged participant to the survivor's heads", () => {
    const trip = fold(
      { defaultSplit: { method: "shares", shares: { p1: 1, p2: 1, p3: 2 } } },
      op({ type: "ParticipantsMerged", fromParticipantId: "p3", intoParticipantId: "p1" }),
    );
    expect(tripTotals(trip).heads).toBe(4);
    const equal = fold({}, op({ type: "ParticipantsMerged", fromParticipantId: "p3", intoParticipantId: "p1" }));
    expect(tripTotals(equal).heads).toBe(2);
  });

  it("for an undated trip divides by the span from the first to the last expense date, inclusive", () => {
    const trip = fold({ from: null, to: null }, spend("e1", 3000, "2026-06-10"), spend("e2", 3000, "2026-06-12"));
    expect(tripTotals(trip)).toMatchObject({ total: 6000, days: 3, perDay: 2000, perPersonPerDay: 667 });
  });

  it("for an undated trip with no expenses has one day and zero figures", () => {
    expect(tripTotals(fold({ from: null, to: null }))).toMatchObject({ total: 0, days: 1, perDay: 0, perPersonPerDay: 0 });
  });

  it("leaves expenses dated before the start out of the per-day averages, but not out of the total", () => {
    const trip = fold({}, spend("booking", 80000, "2026-05-01", "accommodation"), spend("e1", 8000, "2026-06-13"));
    expect(tripTotals(trip)).toMatchObject({ total: 88000, preTripTotal: 80000, days: 8, perDay: 1000 });
  });

  it("with only a start date, leaves earlier bookings out of the per-day averages and counts days to the last expense", () => {
    const trip = fold({ to: null }, spend("booking", 80000, "2026-05-01", "accommodation"), spend("e1", 4000, "2026-06-14"));
    expect(tripTotals(trip)).toMatchObject({ total: 84000, preTripTotal: 80000, days: 2, perDay: 2000 });
  });

  it("shows paid and due per participant (expenses only), settlements left out", () => {
    const trip = fold({}, spend("e1", 9000, "2026-06-13"), op({ type: "SettlementRecorded", settlementId: "s1", fromParticipantId: "p2", toParticipantId: "p1", amount: 500, date: "2026-06-14" }));
    expect(tripTotals(trip).paidDue).toEqual([
      { participantId: "p1", paid: 9000, due: 3000 },
      { participantId: "p2", paid: 0, due: 3000 },
      { participantId: "p3", paid: 0, due: 3000 },
    ]);
  });

  it("spends by category, biggest first, a deleted category counting as Other", () => {
    const trip = fold(
      {},
      op({ type: "CategoryAdded", categoryId: "c1", name: "Aperitivi", emoji: "🍹" }),
      spend("e1", 5000, "2026-06-13", "restaurants"),
      spend("e2", 7000, "2026-06-13", "c1"),
      spend("e3", 1000, "2026-06-13", "other"),
      op({ type: "CategoryDeleted", categoryId: "c1" }),
    );
    expect(tripTotals(trip).byCategory).toEqual([
      { categoryId: "other", amount: 8000 },
      { categoryId: "restaurants", amount: 5000 },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { expenseCreated, expense, op, sequence, tripCreated } from "../../../domain/testing";
import { foldTrip } from "../../../domain";
import { rollDays } from "./roll-days";

const trip = foldTrip(
  sequence([
    tripCreated(),
    expenseCreated("a", expense({ description: "Traghetto", date: "2026-06-13", amount: 4000, categoryId: "transport" }), { at: "2026-06-13T07:00:00Z" }),
    expenseCreated("b", expense({ description: "Spesa al Conad", date: "2026-06-13", amount: 1000, categoryId: "groceries" }), { at: "2026-06-13T18:00:00Z" }),
    expenseCreated("c", expense({ description: "Cena", date: "2026-06-14", amount: 9000 }), { at: "2026-06-14T21:00:00Z" }),
    op({ type: "SettlementRecorded", settlementId: "s1", fromParticipantId: "p2", toParticipantId: "p1", amount: 500, date: "2026-06-14" }),
    op({ type: "ExpenseDeleted", expenseId: "c" }),
  ]),
);
const names: Record<string, string> = { transport: "Trasporti", groceries: "Spesa", restaurants: "Ristoranti" };
const options = { query: "", categoryNameOf: (id: string) => names[id] ?? "Altro" };

describe("rollDays", () => {
  it("groups by day, newest day first, with the day total of live expenses", () => {
    const days = rollDays(trip, options);
    expect(days.map((d) => d.date)).toEqual(["2026-06-14", "2026-06-13"]);
    expect(days[1]?.total).toBe(5000);
  });

  it("puts the newest entry first inside a day and leaves deleted expenses out", () => {
    const days = rollDays(trip, options);
    expect(days[1]?.expenses.map((e) => e.id)).toEqual(["b", "a"]);
    expect(days[0]?.expenses).toEqual([]);
  });

  it("keeps settlements on their day", () => {
    expect(rollDays(trip, options)[0]?.settlements.map((s) => s.id)).toEqual(["s1"]);
  });

  it("searches description and category name, and hides settlements while searching", () => {
    expect(rollDays(trip, { ...options, query: "conad" }).flatMap((d) => d.expenses.map((e) => e.id))).toEqual(["b"]);
    expect(rollDays(trip, { ...options, query: "trasporti" }).flatMap((d) => d.expenses.map((e) => e.id))).toEqual(["a"]);
    expect(rollDays(trip, { ...options, query: "conad" }).flatMap((d) => d.settlements)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { balances, findDuplicateSettlement, foldTrip } from "./index.ts";
import { op, sequence, tripCreated } from "./testing.ts";

const record = (id: string, from = "p2", to = "p1", amount = 1000, date = "2026-06-15") =>
  op({ type: "SettlementRecorded", settlementId: id, fromParticipantId: from, toParticipantId: to, amount, date }, { id: `op-${id}` });

describe("settlements", () => {
  it("restores a deleted settlement from the history", () => {
    const trip = foldTrip(sequence([tripCreated(), record("s1"), op({ type: "SettlementDeleted", settlementId: "s1" }), op({ type: "SettlementRestored", settlementId: "s1" })]));
    expect(trip.settlements[0]?.deleted).toBe(false);
    expect(balances(trip)).toEqual({ p1: -1000, p2: 1000, p3: 0 });
  });

  it("lets a settlement recorded twice stand twice", () => {
    const trip = foldTrip(sequence([tripCreated(), record("s1"), record("s2")]));
    expect(balances(trip)).toEqual({ p1: -2000, p2: 2000, p3: 0 });
  });

  it("allows a partial settlement of any amount", () => {
    const trip = foldTrip(sequence([tripCreated(), record("s1", "p3", "p1", 1)]));
    expect(balances(trip)).toEqual({ p1: -1, p2: 0, p3: 1 });
  });
});

describe("findDuplicateSettlement", () => {
  const trip = foldTrip(sequence([tripCreated(), record("s1"), record("s2", "p3", "p1", 500), op({ type: "SettlementDeleted", settlementId: "s2" })]));

  it("finds a live settlement with the same from, to, amount and date", () => {
    const found = findDuplicateSettlement(trip, { fromParticipantId: "p2", toParticipantId: "p1", amount: 1000, date: "2026-06-15" });
    expect(found?.id).toBe("s1");
  });

  it("does not match a different date, amount or direction", () => {
    const base = { fromParticipantId: "p2", toParticipantId: "p1", amount: 1000, date: "2026-06-15" };
    expect(findDuplicateSettlement(trip, { ...base, date: "2026-06-16" })).toBeUndefined();
    expect(findDuplicateSettlement(trip, { ...base, amount: 999 })).toBeUndefined();
    expect(findDuplicateSettlement(trip, { ...base, fromParticipantId: "p1", toParticipantId: "p2" })).toBeUndefined();
  });

  it("does not match a deleted settlement", () => {
    expect(findDuplicateSettlement(trip, { fromParticipantId: "p3", toParticipantId: "p1", amount: 500, date: "2026-06-15" })).toBeUndefined();
  });
});

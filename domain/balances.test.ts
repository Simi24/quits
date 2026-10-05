import { describe, expect, it } from "vitest";
import { balances, foldTrip, suggestSettlements } from "./index.ts";
import { expense, expenseCreated, op, sequence, tripCreated } from "./testing.ts";

const settle = (id: string, from: string, to: string, amount: number, date = "2026-06-15") =>
  op({ type: "SettlementRecorded", settlementId: id, fromParticipantId: from, toParticipantId: to, amount, date }, { id: `settle-${id}` });

const sum = (b: Record<string, number>) => Object.values(b).reduce((a, c) => a + c, 0);

describe("balances", () => {
  it("is what a participant paid minus what they owe", () => {
    const trip = foldTrip(sequence([tripCreated(), expenseCreated("e1")]));
    expect(balances(trip)).toEqual({ p1: 6000, p2: -3000, p3: -3000 });
  });

  it("sums to zero even with leftover cents", () => {
    const trip = foldTrip(
      sequence([
        tripCreated(),
        expenseCreated("e1", expense({ amount: 100, payers: [{ participantId: "p2", amount: 100 }] })),
      ]),
    );
    const b = balances(trip);
    expect(b).toEqual({ p1: -34, p2: 67, p3: -33 });
    expect(sum(b)).toBe(0);
  });

  it("treats a refund as an expense with the sign reversed", () => {
    const trip = foldTrip(
      sequence([
        tripCreated(),
        expenseCreated("e1", expense({ amount: -3000, payers: [{ participantId: "p3", amount: -3000 }] })),
      ]),
    );
    expect(balances(trip)).toEqual({ p1: 1000, p2: 1000, p3: -2000 });
  });

  it("counts several payers by the exact amount each paid", () => {
    const trip = foldTrip(
      sequence([
        tripCreated(),
        expenseCreated("e1", expense({ payers: [{ participantId: "p1", amount: 6000 }, { participantId: "p2", amount: 3000 }] })),
      ]),
    );
    expect(balances(trip)).toEqual({ p1: 3000, p2: 0, p3: -3000 });
  });

  it("moves a settlement from who gave to who received", () => {
    const trip = foldTrip(sequence([tripCreated(), expenseCreated("e1"), settle("s1", "p2", "p1", 1000)]));
    expect(balances(trip)).toEqual({ p1: 5000, p2: -2000, p3: -3000 });
  });

  it("ignores a deleted expense and a deleted settlement", () => {
    const trip = foldTrip(
      sequence([
        tripCreated(),
        expenseCreated("e1"),
        settle("s1", "p2", "p1", 1000),
        op({ type: "ExpenseDeleted", expenseId: "e1" }),
        op({ type: "SettlementDeleted", settlementId: "s1" }),
      ]),
    );
    expect(balances(trip)).toEqual({ p1: 0, p2: 0, p3: 0 });
  });
});

describe("foldTrip", () => {
  it("folds in sequence order whatever the order of the array", () => {
    const log = sequence([tripCreated(), expenseCreated("e1"), settle("s1", "p2", "p1", 1000)]);
    expect(foldTrip([...log].reverse())).toEqual(foldTrip(log));
  });

  it("applies an operation once, however many times it arrives", () => {
    const log = sequence([tripCreated(), expenseCreated("e1")]);
    const again = [...log, { seq: 3, operation: log[1]!.operation }];
    expect(balances(foldTrip(again))).toEqual({ p1: 6000, p2: -3000, p3: -3000 });
  });
});

describe("suggestSettlements", () => {
  it("is empty when everyone is even", () => {
    expect(suggestSettlements(foldTrip(sequence([tripCreated()])))).toEqual([]);
  });

  it("has the largest debtor pay the largest creditor, at most N-1 payments", () => {
    const trip = foldTrip(
      sequence([
        tripCreated(),
        expenseCreated("e1", expense({ split: { method: "exact", amounts: { p1: 3000, p2: 1000, p3: 5000 } } })),
      ]),
    );
    expect(suggestSettlements(trip)).toEqual([
      { fromParticipantId: "p3", toParticipantId: "p1", amount: 5000 },
      { fromParticipantId: "p2", toParticipantId: "p1", amount: 1000 },
    ]);
  });

  it("breaks ties by order of entry", () => {
    const trip = foldTrip(
      sequence([
        tripCreated(),
        expenseCreated("e1", expense({ split: { method: "exact", amounts: { p1: 3000, p2: 3000, p3: 3000 } } })),
      ]),
    );
    expect(suggestSettlements(trip)).toEqual([
      { fromParticipantId: "p2", toParticipantId: "p1", amount: 3000 },
      { fromParticipantId: "p3", toParticipantId: "p1", amount: 3000 },
    ]);
  });

  it("leaves nothing to suggest once the suggestions are recorded", () => {
    const base = [tripCreated(), expenseCreated("e1", expense({ split: { method: "exact", amounts: { p1: 3000, p2: 1000, p3: 5000 } } }))];
    const suggestions = suggestSettlements(foldTrip(sequence(base)));
    const recorded = suggestions.map((s, i) => settle(`s${i}`, s.fromParticipantId, s.toParticipantId, s.amount));
    expect(suggestSettlements(foldTrip(sequence([...base, ...recorded])))).toEqual([]);
  });
});

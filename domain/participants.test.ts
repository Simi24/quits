import { describe, expect, it } from "vitest";
import type { ExpenseSnapshot } from "./index.ts";
import { balances, canRemoveParticipant, expenseShares, foldTrip } from "./index.ts";
import { expense, expenseCreated, op, sequence, tripCreated } from "./testing.ts";

const fold = (...ops: ReturnType<typeof op>[]) => foldTrip(sequence([tripCreated(), ...ops]));
const ids = (trip: ReturnType<typeof fold>) => trip.participants.map((p) => p.id);
const add = (id: string, name = id) => op({ type: "ParticipantAdded", participantId: id, name });
const remove = (id: string, opId?: string) => op({ type: "ParticipantRemoved", participantId: id }, opId ? { id: opId } : {});
const merge = (from: string, into: string, id = `merge-${from}-${into}`) =>
  op({ type: "ParticipantsMerged", fromParticipantId: from, intoParticipantId: into }, { id });
const paidBy = (p: string, amount: number, split: ExpenseSnapshot["split"]) =>
  expense({ amount, payers: [{ participantId: p, amount }], split });

describe("participants", () => {
  it("adds at any time, after the ones already in the trip", () => {
    const trip = fold(add("p4", "Chiara"));
    expect(ids(trip)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(trip.participants[3]?.name).toBe("Chiara");
  });

  it("gives a new participant one share in a by-shares default split", () => {
    const trip = fold(
      op({ type: "DefaultSplitChanged", defaultSplit: { method: "shares", shares: { p1: 1, p2: 1, p3: 2 } } }),
      add("p4"),
    );
    expect(trip.defaultSplit).toEqual({ method: "shares", shares: { p1: 1, p2: 1, p3: 2, p4: 1 } });
  });

  it("renames always, including a participant that was merged", () => {
    const trip = fold(op({ type: "ParticipantRenamed", participantId: "p2", name: "Sara B." }));
    expect(trip.participants[1]?.name).toBe("Sara B.");
  });

  it("uses the order of entry for tie-breaks, so a late participant gets the leftover cent last", () => {
    const trip = fold(add("p4"), expenseCreated("e1", paidBy("p1", 101, { method: "equal", among: ["p4", "p2"] })));
    expect(expenseShares(trip, trip.expenses[0]!).leftover).toEqual(["p2"]);
  });

  it("removes a participant that is in no expense and no settlement", () => {
    const trip = fold(add("p4"), remove("p4"));
    expect(ids(trip)).toEqual(["p1", "p2", "p3"]);
    expect(Object.keys(balances(trip))).toEqual(["p1", "p2", "p3"]);
  });

  it("refuses to remove a participant that is in an expense, as payer or in the split", () => {
    const trip = fold(expenseCreated("e1", paidBy("p1", 100, { method: "equal", among: ["p1", "p2"] })), remove("p1", "rm-payer"), remove("p2", "rm-split"));
    expect(ids(trip)).toEqual(["p1", "p2", "p3"]);
    expect(trip.history.filter((h) => h.ignored === "participant_in_use").map((h) => h.opId)).toEqual(["rm-payer", "rm-split"]);
    expect(canRemoveParticipant(trip, "p1")).toBe(false);
    expect(canRemoveParticipant(trip, "p3")).toBe(true);
  });

  it("refuses to remove a participant that is in a settlement", () => {
    const trip = fold(
      op({ type: "SettlementRecorded", settlementId: "s1", fromParticipantId: "p3", toParticipantId: "p1", amount: 100, date: "2026-06-15" }),
      remove("p3"),
    );
    expect(ids(trip)).toContain("p3");
  });

  it("allows removal once the only expense that used them is deleted", () => {
    const trip = fold(
      expenseCreated("e1", paidBy("p1", 100, { method: "equal", among: ["p1", "p3"] })),
      op({ type: "ExpenseDeleted", expenseId: "e1" }),
    );
    expect(canRemoveParticipant(trip, "p3")).toBe(true);
  });

  it("drops the removed participant from a by-shares default split", () => {
    const trip = fold(
      op({ type: "DefaultSplitChanged", defaultSplit: { method: "shares", shares: { p1: 1, p2: 1, p3: 2 } } }),
      remove("p3"),
    );
    expect(trip.defaultSplit).toEqual({ method: "shares", shares: { p1: 1, p2: 1 } });
  });

  it("brings a removed participant back when an offline expense uses them afterwards", () => {
    const trip = fold(remove("p3"), expenseCreated("e1", paidBy("p3", 300, { method: "equal", among: ["p1", "p3"] })));
    expect(ids(trip)).toEqual(["p1", "p2", "p3"]);
    expect(balances(trip)).toEqual({ p1: -150, p2: 0, p3: 150 });
  });

  it("ignores an expense that names someone who is not in the trip", () => {
    const trip = fold(expenseCreated("e1", paidBy("ghost", 100, { method: "equal", among: ["p1"] }), { id: "ghost-expense" }));
    expect(trip.expenses).toHaveLength(0);
    expect(trip.history.at(-1)).toMatchObject({ opId: "ghost-expense", ignored: "unknown_participant" });
  });
});

describe("merge", () => {
  it("folds one participant into another: X leaves the trip, every reference to X becomes Y", () => {
    const trip = fold(expenseCreated("e1", paidBy("p3", 9000, { method: "equal", among: ["p1", "p2", "p3"] })), merge("p3", "p1"));
    expect(ids(trip)).toEqual(["p1", "p2"]);
    expect(trip.mergedInto).toEqual({ p3: "p1" });
    expect(balances(trip)).toEqual({ p1: 4500, p2: -4500 });
  });

  it("counts an equal split once for the survivor", () => {
    const trip = fold(expenseCreated("e1", paidBy("p1", 9000, { method: "equal", among: ["p1", "p3"] })), merge("p3", "p1"));
    expect(expenseShares(trip, trip.expenses[0]!).shares).toEqual({ p1: 9000 });
  });

  it("sums payers, exact amounts, percentages and shares of both", () => {
    const payers = [{ participantId: "p1", amount: 3000 }, { participantId: "p3", amount: 6000 }];
    const splits = [
      { method: "exact", amounts: { p1: 3000, p3: 6000 } },
      { method: "percentage", percentages: { p1: 30.5, p3: 69.5 } },
      { method: "shares", shares: { p1: 1, p3: 2 } },
    ] as const;
    for (const split of splits) {
      const trip = fold(expenseCreated("e1", expense({ amount: 9000, payers, split })), merge("p3", "p1"));
      expect(expenseShares(trip, trip.expenses[0]!).shares).toEqual({ p1: 9000 });
      expect(balances(trip)).toEqual({ p1: 0, p2: 0 });
    }
  });

  it("sums percentages and shares when a third participant keeps theirs", () => {
    const percentages = paidBy("p2", 10000, { method: "percentage", percentages: { p1: 20.5, p2: 30, p3: 49.5 } });
    const shares = paidBy("p2", 9000, { method: "shares", shares: { p1: 1, p2: 1, p3: 2 } });
    const trip = fold(expenseCreated("e1", percentages), expenseCreated("e2", shares), merge("p3", "p1"));
    expect(expenseShares(trip, trip.expenses[0]!).shares).toEqual({ p1: 7000, p2: 3000 });
    expect(expenseShares(trip, trip.expenses[1]!).shares).toEqual({ p1: 6750, p2: 2250 });
  });

  it("keeps the survivor's position in the order of entry", () => {
    const trip = fold(expenseCreated("e1", paidBy("p2", 101, { method: "equal", among: ["p1", "p2", "p3"] })), merge("p1", "p3"));
    expect(ids(trip)).toEqual(["p2", "p3"]);
    expect(expenseShares(trip, trip.expenses[0]!).leftover).toEqual(["p2"]);
  });

  it("follows a chain of merges", () => {
    const trip = fold(merge("p3", "p2"), merge("p2", "p1"));
    expect(ids(trip)).toEqual(["p1"]);
    expect(trip.mergedInto).toEqual({ p3: "p1", p2: "p1" });
  });

  it("is reversible: MergeUndone makes the fold skip that merge", () => {
    const before = fold(expenseCreated("e1", paidBy("p3", 9000, { method: "equal", among: ["p1", "p2", "p3"] })));
    const trip = fold(expenseCreated("e1", paidBy("p3", 9000, { method: "equal", among: ["p1", "p2", "p3"] })), merge("p3", "p1", "m1"), op({ type: "MergeUndone", mergeOpId: "m1" }));
    expect(ids(trip)).toEqual(["p1", "p2", "p3"]);
    expect(trip.mergedInto).toEqual({});
    expect(balances(trip)).toEqual(balances(before));
  });

  it("ignores a merge of unknown participants, of a participant into itself, or of one already merged", () => {
    const trip = fold(merge("p1", "p1", "self"), merge("p1", "ghost", "ghost"), merge("p3", "p2", "ok"), merge("p3", "p1", "again"));
    expect(trip.history.filter((h) => h.ignored === "invalid_merge").map((h) => h.opId)).toEqual(["self", "ghost", "again"]);
    expect(trip.mergedInto).toEqual({ p3: "p2" });
  });

  it("does not let a merged participant be removed", () => {
    expect(canRemoveParticipant(fold(merge("p3", "p1")), "p1")).toBe(false);
  });
});

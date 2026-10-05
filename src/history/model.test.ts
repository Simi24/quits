import { describe, expect, it } from "vitest";
import { foldWithPending } from "../../domain";
import type { Operation } from "../../domain";
import { expense, expenseCreated, op, sequence, tripCreated } from "../../domain/testing.ts";
import { changedFields } from "./changed-fields";
import { celebrationDue } from "./celebration";
import { historyItems } from "./model";

const fold = (ops: Operation[]) => foldWithPending(sequence(ops), []);
const items = (ops: Operation[], rejected: Parameters<typeof historyItems>[2] = []) => historyItems(fold(ops), ops, rejected);

describe("historyItems", () => {
  it("lists the newest first", () => {
    const ops = [tripCreated(), expenseCreated("e1"), op({ type: "ExpenseDeleted", expenseId: "e1" }, { id: "del" })];
    expect(items(ops).map((i) => i.id)).toEqual(["del", "create-e1", "created"]);
  });

  it("offers Ripristina only on the latest delete of an expense that is still deleted", () => {
    const del = (id: string) => op({ type: "ExpenseDeleted", expenseId: "e1" }, { id });
    const restore = op({ type: "ExpenseRestored", expenseId: "e1" }, { id: "res" });
    const ops = [tripCreated(), expenseCreated("e1"), del("d1"), restore, del("d2")];
    const actions = Object.fromEntries(items(ops).map((i) => [i.id, i.action]));
    expect(actions["d2"]).toEqual({ kind: "restore-expense", expenseId: "e1" });
    expect(actions["d1"]).toBeNull();
    expect(items([...ops, op({ type: "ExpenseRestored", expenseId: "e1" }, { id: "res2" })]).find((i) => i.id === "d2")?.action).toBeNull();
  });

  it("offers the restore of a deleted settlement", () => {
    const rec = op({ type: "SettlementRecorded", settlementId: "s1", fromParticipantId: "p2", toParticipantId: "p1", amount: 500, date: "2026-06-15" }, { id: "rec" });
    const del = op({ type: "SettlementDeleted", settlementId: "s1" }, { id: "sdel" });
    expect(items([tripCreated(), rec, del]).find((i) => i.id === "sdel")?.action).toEqual({ kind: "restore-settlement", settlementId: "s1" });
  });

  it("offers to undo a merge that stands, and not one already undone", () => {
    const merge = op({ type: "ParticipantsMerged", fromParticipantId: "p3", intoParticipantId: "p2" }, { id: "merge" });
    const undo = op({ type: "MergeUndone", mergeOpId: "merge" }, { id: "undo" });
    expect(items([tripCreated(), merge]).find((i) => i.id === "merge")?.action).toEqual({ kind: "undo-merge", mergeOpId: "merge" });
    expect(items([tripCreated(), merge, undo]).find((i) => i.id === "merge")?.action).toBeNull();
  });

  it("marks what was sequenced after the close", () => {
    const ops = [tripCreated(), op({ type: "TripClosed" }, { id: "close" }), expenseCreated("late")];
    const byId = Object.fromEntries(items(ops).map((i) => [i.id, i.afterClose]));
    expect(byId).toEqual({ created: false, close: false, "create-late": true });
  });

  it("puts a rejected operation on the device that made it, by time, with its reason", () => {
    const ops = [tripCreated({}, { at: "2026-06-01T10:00:00Z" }), expenseCreated("e1", expense(), { at: "2026-06-01T12:00:00Z" })];
    const refused = op({ type: "ExpenseDeleted", expenseId: "e1" }, { id: "nope", at: "2026-06-01T11:00:00Z" });
    const list = items(ops, [{ operation: refused, reason: "malformed", detail: "x" }]);
    expect(list.map((i) => i.id)).toEqual(["create-e1", "nope", "created"]);
    expect(list[1]?.rejected).toEqual({ reason: "malformed", detail: "x" });
    expect(list[1]?.action).toBeNull();
  });

  it("flags the edits made without knowing each other, even after the conflict is cleared", () => {
    const edit = (id: string, base: string) => op({ type: "ExpenseEdited", expenseId: "e1", baseOpId: base, expense: expense({ amount: 100 }) }, { id });
    const ops = [tripCreated(), expenseCreated("e1"), edit("a", "create-e1"), edit("b", "create-e1"), edit("c", "b")];
    const flags = Object.fromEntries(items(ops).map((i) => [i.id, i.conflict]));
    expect(flags).toMatchObject({ a: true, b: true, c: false, "create-e1": false });
  });

  it("remembers the name a participant had before a rename", () => {
    const rename = op({ type: "ParticipantRenamed", participantId: "p2", name: "Sarah" }, { id: "ren" });
    expect(items([tripCreated(), rename]).find((i) => i.id === "ren")?.previousName).toBe("Sara");
  });
});

describe("changedFields", () => {
  it("names what differs between two versions", () => {
    const a = expense();
    const b = expense({ amount: 100, date: "2026-06-15", description: "Pranzo" });
    expect(changedFields(a, b)).toEqual(["description", "amount", "date"]);
    expect(changedFields(a, a)).toEqual([]);
    expect(changedFields(a, expense({ categoryId: "transport", payers: [{ participantId: "p2", amount: 9000 }], split: { method: "exact", amounts: { p1: 9000 } } }))).toEqual(["category", "payers", "split"]);
  });
});

describe("celebrationDue", () => {
  const state = (allEven: boolean, settlements: number) => ({ allEven, settlements });
  it("fires once, when a payment makes everyone even", () => {
    expect(celebrationDue(state(false, 0), state(true, 1))).toBe(true);
    expect(celebrationDue(state(true, 1), state(true, 1))).toBe(false);
    expect(celebrationDue(state(true, 1), state(false, 1))).toBe(false);
    expect(celebrationDue(state(false, 0), state(false, 1))).toBe(false);
  });
  it("does not fire when the expenses change, or for the state the trip opened in", () => {
    expect(celebrationDue(state(false, 0), state(true, 0))).toBe(false);
    expect(celebrationDue(null, state(true, 2))).toBe(false);
  });
});

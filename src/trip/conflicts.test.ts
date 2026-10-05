import { expect, it } from "vitest";
import { foldWithPending } from "../../domain";
import { expense, expenseCreated, op, sequence, tripCreated } from "../../domain/testing.ts";
import { unseenConflicts } from "./conflicts";

const edit = (id: string, base: string, expenseId = "e1") => op({ type: "ExpenseEdited", expenseId, baseOpId: base, expense: expense({ amount: 100 }) }, { id });
const trip = (...extra: ReturnType<typeof op>[]) =>
  foldWithPending(sequence([tripCreated(), expenseCreated("e1"), expenseCreated("e2"), edit("a", "create-e1"), edit("b", "create-e1"), ...extra]), []);

it("lists the live expenses with a conflict this device has not dismissed", () => {
  expect(unseenConflicts(trip(), []).map((e) => e.id)).toEqual(["e1"]);
});

it("leaves out a dismissed conflict and a deleted expense", () => {
  expect(unseenConflicts(trip(), ["b"])).toEqual([]);
  expect(unseenConflicts(trip(op({ type: "ExpenseDeleted", expenseId: "e1" })), [])).toEqual([]);
});

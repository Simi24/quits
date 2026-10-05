import { describe, expect, it } from "vitest";
import { expense, expenseCreated, op, tripCreated } from "../../domain/testing";
import { summarizeMerge } from "./summary";

const settlement = op({ type: "SettlementRecorded", settlementId: "s1", fromParticipantId: "p3", toParticipantId: "p1", amount: 1000, date: "2026-06-15" });

describe("summarizeMerge", () => {
  const dinner = expenseCreated("e1", expense({ amount: 9000, payers: [{ participantId: "p1", amount: 9000 }] }));
  const taxi = expenseCreated("e2", expense({ amount: 1000, payers: [{ participantId: "p1", amount: 1000 }], split: { method: "equal", among: ["p1", "p2"] } }));

  it("counts what X appears in and where X and Y appear together", () => {
    const summary = summarizeMerge([tripCreated(), dinner, taxi, settlement], "p3", "p2");
    expect(summary).toMatchObject({ expenses: 1, expensesWithBoth: 1, settlements: 1 });
  });

  it("leaves out deleted expenses and settlements", () => {
    const ops = [tripCreated(), dinner, op({ type: "ExpenseDeleted", expenseId: "e1" }), settlement, op({ type: "SettlementDeleted", settlementId: "s1" })];
    expect(summarizeMerge(ops, "p3", "p2")).toMatchObject({ expenses: 0, expensesWithBoth: 0, settlements: 0 });
  });

  it("shows Y's balance before and after, with an equal split counting Y once", () => {
    const summary = summarizeMerge([tripCreated(), dinner], "p3", "p2");
    // Dinner of 90,00 paid by p1, among three: 30,00 each. Merged, it is among two: Y owes 45,00.
    expect(summary).toMatchObject({ balanceBefore: -3000, balanceOfFromBefore: -3000, balanceAfter: -4500 });
  });

  it("counts X's shares in a by-shares default split", () => {
    const created = tripCreated({ defaultSplit: { method: "shares", shares: { p1: 1, p2: 1, p3: 2 } } });
    expect(summarizeMerge([created], "p3", "p2").defaultSharesAfter).toBe(3);
    expect(summarizeMerge([tripCreated()], "p3", "p2").defaultSharesAfter).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { foldWithPending } from "../../domain";
import type { Operation } from "../../domain";
import { expenseCreated, op, sequence, tripCreated } from "../../domain/testing.ts";
import { celebrationDue, evenState } from "./celebration";

// Simone paid 90 for the three of them: Sara and Luca owe 30 each.
const dinner = () => [tripCreated(), expenseCreated("e1")];
const pay = (id: string, from: string) =>
  op({ type: "SettlementRecorded", settlementId: id, fromParticipantId: from, toParticipantId: "p1", amount: 3000, date: "2026-06-15" }, { id: `rec-${id}` });

/** The trip as this device sees it: `confirmed` came back from the server, `pending` waits in this device's outbox. */
const state = (confirmed: Operation[], pending: Operation[] = []) => evenState(foldWithPending(sequence(confirmed), pending));

describe("celebrationDue", () => {
  it("celebrates when this device records the payment that brings everyone to zero", () => {
    const before = state(dinner(), [pay("s1", "p2")]);
    expect(celebrationDue(before, state(dinner(), [pay("s1", "p2"), pay("s2", "p3")]))).toBe(true);
  });

  it("does not celebrate payments that arrive from another device, as when opening a trip settled elsewhere", () => {
    expect(celebrationDue(state(dinner()), state([...dinner(), pay("s1", "p2"), pay("s2", "p3")]))).toBe(false);
  });

  it("does not celebrate again when a deleted payment is put back", () => {
    const settled = [...dinner(), pay("s1", "p2"), pay("s2", "p3")];
    const deleted = op({ type: "SettlementDeleted", settlementId: "s2" }, { id: "del" });
    const restored = op({ type: "SettlementRestored", settlementId: "s2" }, { id: "res" });
    expect(celebrationDue(state(settled, [deleted]), state(settled, [deleted, restored]))).toBe(false);
  });

  it("does not celebrate the state the trip opened in, nor a trip made even by deleting its expense", () => {
    expect(celebrationDue(null, state(dinner(), [pay("s1", "p2"), pay("s2", "p3")]))).toBe(false);
    const gone = op({ type: "ExpenseDeleted", expenseId: "e1" }, { id: "gone" });
    expect(celebrationDue(state(dinner()), state(dinner(), [gone]))).toBe(false);
  });
});

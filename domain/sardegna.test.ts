import { describe, expect, it } from "vitest";
import { parseOperation, balances, expenseShares, foldTrip, foldWithPending, suggestSettlements, tripTotals } from "./index.ts";
import type { Operation, StoredOperation } from "./index.ts";
import { op, sequence } from "./testing.ts";
import { sardegnaOperations } from "./sardegna.fixture.ts";

// Expected numbers come from running the prototype's own code (docs/prototype/flussi.html) on its seed.
const log = () => sequence(sardegnaOperations());
const trip = () => foldTrip(log());
const expenseOf = (operations: Operation[], opId: string) =>
  (operations.find((o) => o.id === opId) as Extract<Operation, { type: "ExpenseCreated" }>).expense;

describe("Sardegna 2026, rebuilt as operations", () => {
  it("reproduces the prototype's balances, which sum to zero", () => {
    const b = balances(trip());
    expect(b).toEqual({ p1: 6911, p2: 52121, p3: 8761, p4: -30242, p5: -37551 });
    expect(Object.values(b).reduce((a, c) => a + c, 0)).toBe(0);
  });

  it("suggests 4 settlements for 5 participants", () => {
    expect(suggestSettlements(trip())).toEqual([
      { fromParticipantId: "p5", toParticipantId: "p2", amount: 37551 },
      { fromParticipantId: "p4", toParticipantId: "p2", amount: 14570 },
      { fromParticipantId: "p4", toParticipantId: "p3", amount: 8761 },
      { fromParticipantId: "p4", toParticipantId: "p1", amount: 6911 },
    ]);
  });

  it("totals 4565,18 €, 570,65 € per day and 95,11 € per person per day", () => {
    expect(tripTotals(trip())).toMatchObject({ total: 456518, days: 8, heads: 6, perDay: 57065, perPersonPerDay: 9511 });
  });

  it("puts the leftover cents on the same participants as the prototype's expense details", () => {
    const t = trip();
    const leftovers = Object.fromEntries(
      t.expenses
        .filter((e) => !e.deleted)
        .map((e) => [e.id, expenseShares(t, e).leftover])
        .filter(([, leftover]) => (leftover as string[]).length > 0),
    );
    expect(leftovers).toEqual({
      e2: ["p1", "p2", "p4"],
      e4: ["p3"],
      e5: ["p3", "p1"],
      e6: ["p3", "p1"],
      e11: ["p1", "p2", "p4"],
      e12: ["p1", "p2", "p4"],
      e14: ["p1", "p2"],
      e16: ["p1", "p2"],
      e18: ["p1", "p2", "p4"],
    });
    const fish = t.expenses.find((e) => e.id === "e14")!;
    expect(expenseShares(t, fish).shares).toEqual({ p1: 3710, p2: 3710, p3: 8655, p4: 4946, p5: 3709 });
  });

  it("shows the e4 conflict with Luca's version winning, and e23 deleted", () => {
    const t = trip();
    const e4 = t.expenses.find((e) => e.id === "e4")!;
    expect(e4.conflict).toEqual({ baseOpId: "create-e4", winnerOpId: "e4-theirs", loserOpIds: ["e4-mine"] });
    expect(e4.snapshot).toMatchObject({ amount: 8743, payers: [{ participantId: "p5", amount: 6000 }, { participantId: "p4", amount: 2743 }] });
    expect(t.expenses.find((e) => e.id === "e23")?.deleted).toBe(true);
  });

  it("converges whatever order the operations arrive in, once sequenced", () => {
    const expected = trip();
    expect(foldTrip([...log()].reverse())).toEqual(expected);
    const shuffled = [...log()].sort((a, b) => ((a.seq * 7919) % 31) - ((b.seq * 7919) % 31));
    expect(foldTrip(shuffled)).toEqual(expected);
  });

  it("converges between two devices that each edited the same expense offline, once the server sequenced both", () => {
    const base = sardegnaOperations();
    const e4 = expenseOf(base, "create-e4");
    const fromA = op({ type: "ExpenseEdited", expenseId: "e4", baseOpId: "e4-theirs", expense: { ...e4, description: "Cena A" } }, { id: "a-edit", by: "p1", device: "a" });
    const fromB = op({ type: "ExpenseEdited", expenseId: "e4", baseOpId: "e4-theirs", expense: { ...e4, description: "Cena B" } }, { id: "b-edit", by: "p2", device: "b" });
    const confirmed = sequence(base);
    // Offline, each device sees only its own edit.
    expect(foldWithPending(confirmed, [fromA]).expenses.find((e) => e.id === "e4")?.snapshot.description).toBe("Cena A");
    expect(foldWithPending(confirmed, [fromB]).expenses.find((e) => e.id === "e4")?.snapshot.description).toBe("Cena B");
    // The server sequenced B's push, then A's; each device pulls that log and still has its own in the outbox.
    const serverLog = sequence([...base, fromB, fromA]);
    const deviceA = foldWithPending([...serverLog].reverse(), [fromA]);
    const deviceB = foldWithPending(serverLog, [fromB]);
    expect(deviceA).toEqual(deviceB);
    expect(deviceA.expenses.find((e) => e.id === "e4")?.conflict).toEqual({ baseOpId: "e4-theirs", winnerOpId: "a-edit", loserOpIds: ["b-edit"] });
    for (const { operation } of serverLog) expect(parseOperation(operation)).toMatchObject({ ok: true });
  });
});

describe("restore after delete-wins, on the Sardegna trip", () => {
  it("brings back the edit that lost to the delete", () => {
    const base = sardegnaOperations();
    const edited = { ...expenseOf(base, "create-e10"), amount: 16000, payers: [{ participantId: "p5", amount: 16000 }] };
    const operations = [
      ...base,
      op({ type: "ExpenseDeleted", expenseId: "e10" }, { id: "del-e10" }),
      op({ type: "ExpenseEdited", expenseId: "e10", baseOpId: "create-e10", expense: edited }, { id: "edit-e10" }),
    ];
    const stillDeleted = foldTrip(sequence(operations)).expenses.find((e) => e.id === "e10")!;
    expect(stillDeleted.deleted).toBe(true);
    const restoredLog = sequence([...operations, op({ type: "ExpenseRestored", expenseId: "e10" }, { id: "restore-e10" })]);
    for (const { operation } of restoredLog) expect(parseOperation(operation)).toMatchObject({ ok: true });
    const e10 = foldTrip(restoredLog).expenses.find((e) => e.id === "e10")!;
    expect(e10.deleted).toBe(false);
    expect(e10.snapshot.amount).toBe(16000);
    expect(tripTotals(foldTrip(restoredLog)).total).toBe(456518 + 1000);
  });
});

describe("older versions", () => {
  const legacy = (): StoredOperation[] =>
    sardegnaOperations().map((o) => {
      if (o.type !== "ExpenseCreated" && o.type !== "ExpenseEdited") return { ...o, v: 1 } as unknown as StoredOperation;
      const { categoryId, ...rest } = o.expense;
      return { ...o, v: 1, expense: { ...rest, category: categoryId } } as unknown as StoredOperation;
    });

  it("are accepted by the schema, like the current ones", () => {
    for (const operation of [...sardegnaOperations(), ...legacy()]) {
      expect(parseOperation(JSON.parse(JSON.stringify(operation)))).toEqual({ ok: true, operation });
    }
  });

  it("fold like their current form", () => {
    expect(foldTrip(legacy().map((operation, i) => ({ seq: i + 1, operation })))).toEqual(trip());
  });
});

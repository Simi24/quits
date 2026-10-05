import { describe, expect, it } from "vitest";
import { balances, foldTrip, foldWithPending } from "./index.ts";
import { expense, expenseCreated, op, sequence, tripCreated } from "./testing.ts";

const paid = (id: string, amount: number, by: string) =>
  expenseCreated(id, expense({ amount, payers: [{ participantId: by, amount }] }), { by });

describe("foldWithPending", () => {
  const base = [tripCreated(), paid("e1", 9000, "p1")];

  it("folds the pending operations on top of the confirmed log, marked pending", () => {
    const confirmed = sequence(base);
    const mine = paid("e2", 3000, "p2");
    const trip = foldWithPending(confirmed, [mine]);
    expect(balances(trip)).toEqual({ p1: 5000, p2: -1000, p3: -4000 });
    expect(trip.history.map((h) => [h.opId, h.pending])).toEqual([
      ["created", false],
      ["create-e1", false],
      [mine.id, true],
    ]);
  });

  it("keeps pending operations in outbox order, after everything confirmed", () => {
    const first = op({ type: "TripRenamed", name: "Uno" });
    const second = op({ type: "TripRenamed", name: "Due" });
    expect(foldWithPending(sequence(base), [first, second]).name).toBe("Due");
  });

  it("re-applies the outbox after a pull brings others' operations in", () => {
    const mine = op({ type: "TripRenamed", name: "Mia" });
    const theirs = op({ type: "TripRenamed", name: "Sua" });
    const beforePull = foldWithPending(sequence(base), [mine]);
    const afterPull = foldWithPending(sequence([...base, theirs]), [mine]);
    expect(beforePull.name).toBe("Mia");
    expect(afterPull.name).toBe("Mia");
    expect(afterPull.history.at(-1)).toMatchObject({ opId: mine.id, pending: true });
  });

  it("does not apply an operation twice once the server has confirmed it", () => {
    const mine = paid("e2", 3000, "p2");
    const confirmed = sequence([...base, mine]);
    const trip = foldWithPending(confirmed, [mine]);
    expect(trip).toEqual(foldTrip(confirmed));
    expect(trip.history.some((h) => h.pending)).toBe(false);
  });

  it("converges: two devices end on the same trip once the server sequenced both outboxes", () => {
    const fromA = paid("ea", 3000, "p1");
    const fromB = paid("eb", 600, "p2");
    // Server order: B's, then A's.
    const log = sequence([...base, fromB, fromA]);
    const deviceA = foldWithPending(log, []);
    const deviceB = foldWithPending(sequence([...base, fromB, fromA]), [fromB]);
    expect(deviceA).toEqual(deviceB);
    // Whatever order the pulled operations arrive in, sequencing puts them right.
    expect(foldTrip([...log].reverse())).toEqual(deviceA);
  });
});

describe("folding never changes the log", () => {
  const log = () =>
    sequence([
      tripCreated({ defaultSplit: { method: "shares", shares: { p1: 2, p2: 1, p3: 1 } } }),
      op({ type: "ParticipantAdded", participantId: "p4", name: "Chiara" }),
      op({ type: "ParticipantRemoved", participantId: "p3" }),
    ]);

  it("leaves the operations as they were", () => {
    const operations = log();
    const before = structuredClone(operations);
    foldTrip(operations);
    expect(operations).toEqual(before);
  });

  it("gives the same trip when the same log is folded again after a longer one", () => {
    const operations = log();
    const first = structuredClone(foldTrip(operations.slice(0, 1)));
    foldTrip(operations);
    expect(foldTrip(operations.slice(0, 1))).toEqual(first);
  });
});

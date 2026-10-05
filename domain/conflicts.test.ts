import { describe, expect, it } from "vitest";
import { foldTrip } from "./index.ts";
import { expense, expenseCreated, op, sequence, tripCreated } from "./testing.ts";

const create = expenseCreated("e1", expense({ description: "Cena" }));
const edit = (id: string, baseOpId: string, snapshot = expense(), by = "p1") =>
  op({ type: "ExpenseEdited", expenseId: "e1", baseOpId, expense: snapshot }, { id, by });
const del = (id = "del") => op({ type: "ExpenseDeleted", expenseId: "e1" }, { id });
const restore = (id = "restore") => op({ type: "ExpenseRestored", expenseId: "e1" }, { id });
const fold = (...ops: ReturnType<typeof op>[]) => foldTrip(sequence([tripCreated(), create, ...ops]));
const record = (trip: ReturnType<typeof fold>) => trip.expenses[0]!;

describe("editing an expense", () => {
  it("replaces the whole snapshot and keeps every version", () => {
    const trip = fold(edit("edit-1", "create-e1", expense({ description: "Cena di pesce", amount: 12000, payers: [{ participantId: "p1", amount: 12000 }] })));
    expect(record(trip).snapshot.description).toBe("Cena di pesce");
    expect(record(trip).versions.map((v) => [v.opId, v.kind, v.baseOpId])).toEqual([
      ["create-e1", "created", null],
      ["edit-1", "edited", "create-e1"],
    ]);
    expect(record(trip).conflict).toBeNull();
  });

  it("is no conflict when each edit is based on the previous one", () => {
    const trip = fold(edit("edit-1", "create-e1"), edit("edit-2", "edit-1"));
    expect(record(trip).conflict).toBeNull();
  });

  it("ignores an edit of an expense that does not exist", () => {
    const stray = op({ type: "ExpenseEdited", expenseId: "nope", baseOpId: "x", expense: expense() }, { id: "stray" });
    const trip = foldTrip(sequence([tripCreated(), stray]));
    expect(trip.history.at(-1)?.ignored).toBe("unknown_target");
  });
});

describe("conflicts", () => {
  const mine = expense({ description: "Cena e crema solare", amount: 9643, payers: [{ participantId: "p1", amount: 9643 }] });
  const theirs = expense({ description: "Cena", payers: [{ participantId: "p1", amount: 6000 }, { participantId: "p2", amount: 3000 }] });

  it("detects two edits with the same baseOpId; the one sequenced last wins on the whole expense", () => {
    const trip = fold(edit("mine", "create-e1", mine, "p1"), edit("theirs", "create-e1", theirs, "p2"));
    expect(record(trip).snapshot).toEqual(theirs);
    expect(record(trip).conflict).toEqual({ baseOpId: "create-e1", winnerOpId: "theirs", loserOpIds: ["mine"] });
    expect(record(trip).versions.map((v) => v.opId)).toEqual(["create-e1", "mine", "theirs"]);
  });

  it("keeps the other order's winner when the arrival order flips", () => {
    const trip = fold(edit("theirs", "create-e1", theirs, "p2"), edit("mine", "create-e1", mine, "p1"));
    expect(record(trip).snapshot).toEqual(mine);
    expect(record(trip).conflict).toMatchObject({ winnerOpId: "mine", loserOpIds: ["theirs"] });
  });

  it("collects every loser of three concurrent edits", () => {
    const trip = fold(edit("a", "create-e1"), edit("b", "create-e1"), edit("c", "create-e1"));
    expect(record(trip).conflict).toEqual({ baseOpId: "create-e1", winnerOpId: "c", loserOpIds: ["a", "b"] });
  });

  it("names as winner the version the expense now shows, when an edit builds on a loser", () => {
    const trip = fold(edit("a", "create-e1"), edit("b", "create-e1"), edit("d", "a", mine));
    expect(record(trip).snapshot).toEqual(mine);
    expect(record(trip).conflict).toEqual({ baseOpId: "a", winnerOpId: "d", loserOpIds: ["b"] });
  });

  it("names every version the winner never saw, not only the ones sharing its base", () => {
    const trip = fold(edit("a", "create-e1"), edit("b", "a"), edit("c", "create-e1", mine));
    expect(record(trip).conflict).toEqual({ baseOpId: "create-e1", winnerOpId: "c", loserOpIds: ["a", "b"] });
  });

  it("is settled once someone edits on top of the winner", () => {
    const trip = fold(edit("a", "create-e1"), edit("b", "create-e1"), edit("c", "b"));
    expect(record(trip).conflict).toBeNull();
  });
});

describe("delete wins", () => {
  const changed = expense({ description: "Cena di pesce" });

  it("keeps an expense deleted when an edit is sequenced after the delete", () => {
    const trip = fold(del(), edit("edit-1", "create-e1", changed));
    expect(record(trip).deleted).toBe(true);
    expect(record(trip).versions).toHaveLength(2);
  });

  it("keeps an expense deleted when the edit came first", () => {
    expect(record(fold(edit("edit-1", "create-e1", changed), del())).deleted).toBe(true);
  });
});

describe("restore", () => {
  const changed = expense({ description: "Cena di pesce" });

  it("brings back a deleted expense", () => {
    const trip = fold(del(), restore());
    expect(record(trip).deleted).toBe(false);
  });

  it("brings back the latest version by sequence, including an edit that lost to the delete", () => {
    const trip = fold(del(), edit("edit-1", "create-e1", changed), restore());
    expect(record(trip).deleted).toBe(false);
    expect(record(trip).snapshot).toEqual(changed);
    expect(trip.history.map((h) => h.type)).toEqual(["TripCreated", "ExpenseCreated", "ExpenseDeleted", "ExpenseEdited", "ExpenseRestored"]);
  });

  it("restoring an older version is a new edit carrying that snapshot", () => {
    const original = expense();
    const trip = fold(edit("edit-1", "create-e1", changed), edit("back", "edit-1", original));
    expect(record(trip).snapshot).toEqual(original);
  });

  it("does nothing to an expense that is not deleted", () => {
    expect(record(fold(restore())).deleted).toBe(false);
  });
});

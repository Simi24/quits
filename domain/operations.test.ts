import { describe, expect, it } from "vitest";
import { parseOperation, upcastOperation, CURRENT_VERSION } from "./index.ts";
import { expense, expenseCreated, op, tripCreated } from "./testing.ts";

describe("parseOperation", () => {
  it("accepts a well-formed operation of every kind it knows", () => {
    const operations = [
      tripCreated(),
      expenseCreated("e1"),
      op({ type: "TripRenamed", name: "Corsica" }),
      op({ type: "SettlementRecorded", settlementId: "s1", fromParticipantId: "p2", toParticipantId: "p1", amount: 500, date: "2026-06-15" }),
      op({ type: "CategoryAdded", categoryId: "c1", name: "Aperitivi", emoji: "🍹" }),
      op({ type: "ParticipantsMerged", fromParticipantId: "p3", intoParticipantId: "p1" }),
      op({ type: "MergeUndone", mergeOpId: "m1" }),
    ];
    for (const operation of operations) {
      expect(parseOperation(JSON.parse(JSON.stringify(operation)))).toEqual({ ok: true, operation });
    }
  });

  it("rejects an expense that breaks its invariants", () => {
    const unbalanced = expenseCreated("e1", expense({ payers: [{ participantId: "p1", amount: 100 }] }));
    const result = parseOperation(unbalanced);
    expect(result).toMatchObject({ ok: false, reason: "malformed" });
  });

  it("rejects a settlement between the same participant", () => {
    const result = parseOperation(
      op({ type: "SettlementRecorded", settlementId: "s1", fromParticipantId: "p1", toParticipantId: "p1", amount: 500, date: "2026-06-15" }),
    );
    expect(result).toMatchObject({ ok: false, reason: "malformed" });
  });

  it("rejects a trip created with fewer than two participants", () => {
    const result = parseOperation(tripCreated({ participants: [{ id: "p1", name: "Simone" }] }));
    expect(result).toMatchObject({ ok: false, reason: "malformed" });
  });

  it("tells an unknown version from a malformed operation", () => {
    expect(parseOperation({ ...op({ type: "TripRenamed", name: "X" }), v: 99 })).toMatchObject({
      ok: false,
      reason: "unknown_version",
    });
    expect(parseOperation({ nonsense: true })).toMatchObject({ ok: false, reason: "malformed" });
    expect(parseOperation(null)).toMatchObject({ ok: false, reason: "malformed" });
  });

  it("does not echo operation contents in the rejection detail", () => {
    const secret = "SECRET-DESCRIPTION";
    const result = parseOperation(expenseCreated("e1", expense({ description: secret, amount: 1.5 })));
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});

describe("upcastOperation", () => {
  it("turns an operation of version 1 into the current form", () => {
    const { categoryId, ...rest } = expense({ categoryId: "groceries" });
    const legacy = {
      ...op({ type: "ExpenseCreated", expenseId: "e1", expense: { ...rest, category: categoryId } }),
      v: 1,
    };
    const parsed = parseOperation(legacy);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const upcast = upcastOperation(parsed.operation);
    expect(upcast.v).toBe(CURRENT_VERSION);
    expect(upcast).toEqual({ ...legacy, v: CURRENT_VERSION, expense: expense({ categoryId: "groceries" }) });
  });
});

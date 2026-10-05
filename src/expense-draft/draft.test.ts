import { describe, expect, it } from "vitest";
import type { DefaultSplit } from "../../domain";
import { draftFromSnapshot, evaluateDraft, newDraft } from "./draft";
import type { DraftContext, ExpenseDraft } from "./draft";

const ctx: DraftContext = {
  currency: "EUR",
  locale: "it",
  participants: [
    { id: "p1", name: "Simone" },
    { id: "p2", name: "Sara" },
    { id: "p3", name: "Luca" },
  ],
};

const filled = (changes: Partial<ExpenseDraft> = {}): ExpenseDraft => ({
  ...newDraft(ctx, "p1", { method: "equal" }, "2026-06-14"),
  description: "Cena",
  amount: "90,00",
  ...changes,
});

const codes = (draft: ExpenseDraft) => evaluateDraft(draft, ctx).issues.map((i) => i.code);

describe("a new draft", () => {
  it("starts with the device's person paying and everyone included", () => {
    const draft = newDraft(ctx, "p2", { method: "equal" }, "2026-06-14");
    expect(draft).toMatchObject({ kind: "expense", payer: "p2", method: "equal", among: ["p1", "p2", "p3"], date: "2026-06-14", categoryId: "other" });
  });

  it("is prefilled with the default split by shares", () => {
    const defaultSplit: DefaultSplit = { method: "shares", shares: { p1: 1, p2: 1, p3: 2 } };
    const draft = newDraft(ctx, "p1", defaultSplit, "2026-06-14");
    expect(draft).toMatchObject({ method: "shares", shares: { p1: 1, p2: 1, p3: 2 }, fromDefault: true });
  });
});

describe("evaluating a draft", () => {
  it("refuses a draft whose date was cleared, as the operation schema would", () => {
    expect(codes(filled({ date: "" }))).toEqual(["date_missing"]);
  });

  it("builds the expense snapshot: one payer, equal split", () => {
    const { snapshot, issues } = evaluateDraft(filled(), ctx);
    expect(issues).toEqual([]);
    expect(snapshot).toEqual({
      description: "Cena",
      amount: 9000,
      date: "2026-06-14",
      categoryId: "other",
      payers: [{ participantId: "p1", amount: 9000 }],
      split: { method: "equal", among: ["p1", "p2", "p3"] },
    });
  });

  it("asks for a description and an amount", () => {
    expect(codes(filled({ description: "  ", amount: "" }))).toEqual(["description_missing", "amount_zero"]);
  });

  it("shows each person's share, and who gets the leftover cent", () => {
    const { result } = evaluateDraft(filled({ amount: "100,00" }), ctx);
    expect(result?.shares).toEqual({ p1: 3334, p2: 3333, p3: 3333 });
    expect(result?.leftover).toEqual(["p1"]);
  });

  it("has no result while the split is invalid", () => {
    expect(evaluateDraft(filled({ among: [] }), ctx).result).toBeNull();
  });

  it("requires at least one person in an equal split", () => {
    expect(codes(filled({ among: [] }))).toEqual(["split_nobody"]);
  });

  it("requires at least one share in a split by shares", () => {
    expect(codes(filled({ method: "shares", shares: { p1: 0, p2: 0, p3: 0 } }))).toEqual(["split_nobody"]);
  });

  it("says how much is missing or too much in exact amounts", () => {
    const base = { method: "exact" as const };
    expect(evaluateDraft(filled({ ...base, exact: { p1: "50,00", p2: "30,00" } }), ctx).issues).toEqual([{ code: "exact_missing", missing: 1000 }]);
    expect(evaluateDraft(filled({ ...base, exact: { p1: "50,00", p2: "50,00" } }), ctx).issues).toEqual([{ code: "exact_excess", excess: 1000 }]);
    expect(evaluateDraft(filled({ ...base, exact: { p1: "50,00", p2: "40,00" } }), ctx).issues).toEqual([]);
  });

  it("requires percentages to make exactly 100", () => {
    const issues = evaluateDraft(filled({ method: "percentage", percent: { p1: "50", p2: "30,5" } }), ctx).issues;
    expect(issues).toEqual([{ code: "percentage_total", total: 80.5 }]);
    expect(codes(filled({ method: "percentage", percent: { p1: "33,33", p2: "33,33", p3: "33,34" } }))).toEqual([]);
  });

  it("stores a refund with the sign reversed, payers included", () => {
    const { snapshot } = evaluateDraft(filled({ kind: "refund", amount: "300,00", payer: "p3" }), ctx);
    expect(snapshot.amount).toBe(-30000);
    expect(snapshot.payers).toEqual([{ participantId: "p3", amount: -30000 }]);
  });

  it("takes several payers, who must add up to the total", () => {
    const multi = filled({ multiPayer: true, payerAmounts: { p1: "60,00", p2: "20,00" } });
    expect(evaluateDraft(multi, ctx).issues).toEqual([{ code: "payers_short", missing: 1000 }]);
    const exact = filled({ multiPayer: true, payerAmounts: { p1: "60,00", p2: "30,00" } });
    expect(evaluateDraft(exact, ctx).snapshot.payers).toEqual([
      { participantId: "p1", amount: 6000 },
      { participantId: "p2", amount: 3000 },
    ]);
  });
});

describe("editing", () => {
  it("round-trips a snapshot through its draft", () => {
    const original = evaluateDraft(
      filled({ kind: "refund", amount: "12,50", method: "percentage", percent: { p1: "50", p2: "25", p3: "25" }, categoryId: "transport" }),
      ctx,
    ).snapshot;
    const again = evaluateDraft(draftFromSnapshot(original, ctx), ctx);
    expect(again.issues).toEqual([]);
    expect(again.snapshot).toEqual(original);
  });
});

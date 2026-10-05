import { OTHER_CATEGORY_ID, expenseSnapshotSchema, splitExpense, validateExpense } from "../../domain";
import type { DefaultSplit, ExpenseIssue, ExpenseSnapshot, Participant, SplitMethod, SplitResult } from "../../domain";
import { amountToInput, parseAmount } from "../format/money";
import type { Locale } from "../format/money";

type Id = string;

/** What the expense sheet edits: text as typed, until it is turned into a snapshot. */
export interface ExpenseDraft {
  kind: "expense" | "refund";
  description: string;
  amount: string;
  date: string;
  categoryId: string;
  multiPayer: boolean;
  payer: Id;
  payerAmounts: Record<Id, string>;
  method: SplitMethod;
  among: Id[];
  shares: Record<Id, number>;
  exact: Record<Id, string>;
  percent: Record<Id, string>;
  /** Shown as a hint while the split still is the trip's default. */
  fromDefault: boolean;
}

export interface DraftContext {
  currency: string;
  locale: Locale;
  participants: Participant[];
}

/** What the domain finds wrong with an expense, plus what only a half-filled form can get wrong. */
export type DraftIssue = ExpenseIssue | { code: "date_missing" };

export interface Evaluation {
  snapshot: ExpenseSnapshot;
  issues: DraftIssue[];
  /** Each person's share and who got the leftover cent; null while the amount or the split is not valid. */
  result: SplitResult | null;
}

const everyoneOnce = (participants: Participant[]): Record<Id, number> =>
  Object.fromEntries(participants.map((p) => [p.id, 1]));

/** A new expense: the device's person pays, the trip's default split is prefilled (SPEC.md §3.5). */
export function newDraft(ctx: DraftContext, meId: Id, defaultSplit: DefaultSplit, today: string): ExpenseDraft {
  return {
    kind: "expense",
    description: "",
    amount: "",
    date: today,
    categoryId: OTHER_CATEGORY_ID,
    multiPayer: false,
    payer: meId,
    payerAmounts: {},
    method: defaultSplit.method === "shares" ? "shares" : "equal",
    among: ctx.participants.map((p) => p.id),
    shares: defaultSplit.method === "shares" ? { ...defaultSplit.shares } : everyoneOnce(ctx.participants),
    exact: {},
    percent: {},
    fromDefault: true,
  };
}

/** The sheet for an existing expense, so editing starts from what was saved. */
export function draftFromSnapshot(snapshot: ExpenseSnapshot, ctx: DraftContext): ExpenseDraft {
  const { split } = snapshot;
  const text = (minor: number) => amountToInput(minor, ctx.currency, ctx.locale);
  const mark = (n: number) => String(n).replace(".", ctx.locale === "it" ? "," : ".");
  return {
    kind: snapshot.amount < 0 ? "refund" : "expense",
    description: snapshot.description,
    amount: text(snapshot.amount),
    date: snapshot.date,
    categoryId: snapshot.categoryId,
    multiPayer: snapshot.payers.length > 1,
    payer: snapshot.payers[0]?.participantId ?? ctx.participants[0]?.id ?? "",
    payerAmounts: Object.fromEntries(snapshot.payers.map((p) => [p.participantId, text(p.amount)])),
    method: split.method,
    among: split.method === "equal" ? [...split.among] : ctx.participants.map((p) => p.id),
    shares: split.method === "shares" ? { ...split.shares } : everyoneOnce(ctx.participants),
    exact: split.method === "exact" ? Object.fromEntries(Object.entries(split.amounts).map(([id, v]) => [id, text(v)])) : {},
    percent: split.method === "percentage" ? Object.fromEntries(Object.entries(split.percentages).map(([id, v]) => [id, mark(v)])) : {},
    fromDefault: false,
  };
}

const percentOf = (text: string | undefined): number => {
  const value = Number((text ?? "").replace(",", "."));
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
};

function splitOf(draft: ExpenseDraft, ctx: DraftContext): ExpenseSnapshot["split"] {
  const ids = ctx.participants.map((p) => p.id);
  const minor = (text: string | undefined) => parseAmount(text ?? "", ctx.currency) ?? 0;
  switch (draft.method) {
    case "equal":
      return { method: "equal", among: ids.filter((id) => draft.among.includes(id)) };
    case "shares":
      return { method: "shares", shares: Object.fromEntries(ids.map((id) => [id, draft.shares[id] ?? 0]).filter(([, n]) => (n as number) > 0)) };
    case "exact":
      return { method: "exact", amounts: Object.fromEntries(ids.map((id) => [id, minor(draft.exact[id])]).filter(([, n]) => (n as number) > 0)) };
    case "percentage":
      return { method: "percentage", percentages: Object.fromEntries(ids.map((id) => [id, percentOf(draft.percent[id])]).filter(([, n]) => (n as number) > 0)) };
  }
}

/** Turns the draft into the snapshot an operation carries, with the domain's verdict and live shares. */
export function evaluateDraft(draft: ExpenseDraft, ctx: DraftContext): Evaluation {
  const sign = draft.kind === "refund" ? -1 : 1;
  const entered = parseAmount(draft.amount, ctx.currency);
  const amount = entered !== null && entered > 0 ? entered : 0;
  const payers = draft.multiPayer
    ? ctx.participants
        .map((p) => ({ participantId: p.id, amount: parseAmount(draft.payerAmounts[p.id] ?? "", ctx.currency) ?? 0 }))
        .filter((p) => p.amount > 0)
        .map((p) => ({ ...p, amount: sign * p.amount }))
    : [{ participantId: draft.payer, amount: sign * amount }];
  const snapshot: ExpenseSnapshot = {
    description: draft.description.trim(),
    amount: sign * amount,
    date: draft.date,
    categoryId: draft.categoryId,
    payers,
    split: splitOf(draft, ctx),
  };
  const dated = expenseSnapshotSchema.shape.date.safeParse(snapshot.date).success;
  const issues: DraftIssue[] = [...validateExpense(snapshot), ...(dated ? [] : [{ code: "date_missing" as const }])];
  const splitIsValid = !issues.some((i) => i.code.startsWith("split_") || i.code.startsWith("exact_") || i.code.startsWith("percentage_"));
  const result = amount > 0 && splitIsValid ? splitExpense(snapshot.amount, snapshot.split, ctx.participants.map((p) => p.id)) : null;
  return { snapshot, issues, result };
}

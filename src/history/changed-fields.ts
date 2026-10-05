import type { ExpenseSnapshot } from "../../domain";

export type ChangedField = "description" | "amount" | "date" | "category" | "payers" | "split";

const read: Record<ChangedField, (s: ExpenseSnapshot) => unknown> = {
  description: (s) => s.description,
  amount: (s) => s.amount,
  date: (s) => s.date,
  category: (s) => s.categoryId,
  payers: (s) => s.payers,
  split: (s) => s.split,
};

/** What an edit changed, from one version of an expense to the next (prototype `diff`). */
export const changedFields = (before: ExpenseSnapshot, after: ExpenseSnapshot): ChangedField[] =>
  (Object.keys(read) as ChangedField[]).filter((field) => JSON.stringify(read[field](before)) !== JSON.stringify(read[field](after)));

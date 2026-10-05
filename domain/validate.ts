import type { ExpenseSnapshot } from "./expense.ts";
import { percentageWeight } from "./split.ts";
import type { Split } from "./split.ts";

export type ExpenseIssue =
  | { code: "description_missing" }
  | { code: "amount_zero" }
  | { code: "amount_not_integer" }
  | { code: "payers_short"; missing: number }
  | { code: "payers_over"; excess: number }
  | { code: "split_nobody" }
  | { code: "exact_missing"; missing: number }
  | { code: "exact_excess"; excess: number }
  | { code: "percentage_total"; total: number };

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

function splitIssues(amount: number, split: Split): ExpenseIssue[] {
  switch (split.method) {
    case "equal":
      return split.among.length === 0 ? [{ code: "split_nobody" }] : [];
    case "shares":
      return sum(Object.values(split.shares)) === 0 ? [{ code: "split_nobody" }] : [];
    case "exact": {
      const diff = Math.abs(amount) - sum(Object.values(split.amounts));
      if (diff > 0) return [{ code: "exact_missing", missing: diff }];
      if (diff < 0) return [{ code: "exact_excess", excess: -diff }];
      return [];
    }
    case "percentage": {
      const weights = sum(Object.values(split.percentages).map(percentageWeight));
      return weights === 10000 ? [] : [{ code: "percentage_total", total: weights / 100 }];
    }
  }
}

/** The rules of SPEC.md §3.5 and §3.6. An expense with any issue is not saved. */
export function validateExpense(expense: ExpenseSnapshot): ExpenseIssue[] {
  const issues: ExpenseIssue[] = [];
  if (expense.description.trim() === "") issues.push({ code: "description_missing" });
  if (!Number.isInteger(expense.amount)) {
    issues.push({ code: "amount_not_integer" });
    return issues;
  }
  if (expense.amount === 0) issues.push({ code: "amount_zero" });
  else {
    const diff = expense.amount - sum(expense.payers.map((p) => p.amount));
    if (diff > 0) issues.push({ code: "payers_short", missing: Math.abs(diff) });
    if (diff < 0) issues.push({ code: "payers_over", excess: Math.abs(diff) });
  }
  issues.push(...splitIssues(expense.amount, expense.split));
  return issues;
}

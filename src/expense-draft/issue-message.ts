import type { ExpenseIssue, SplitMethod } from "../../domain";
import type { Dictionary, Lang } from "../i18n";

/** Issues the sheet reports as you type; the others wait until the first attempt to save. */
export const isLiveIssue = (issue: ExpenseIssue): boolean =>
  issue.code === "split_nobody" ||
  issue.code === "exact_missing" ||
  issue.code === "exact_excess" ||
  issue.code === "percentage_total" ||
  issue.code === "payers_short" ||
  issue.code === "payers_over";

/** The IT/EN message for what the domain found wrong (SPEC.md §3.6; the wording is the prototype's). */
export function issueMessage(issue: ExpenseIssue, method: SplitMethod, t: Dictionary["expenses"], money: (minor: number) => string, lang: Lang): string {
  switch (issue.code) {
    case "description_missing":
      return t.vDesc;
    case "amount_zero":
    case "amount_not_integer":
      return t.vAmount;
    case "payers_short":
      return t.vPayMissing(money(issue.missing));
    case "payers_over":
      return t.vPayOver(money(issue.excess));
    case "split_nobody":
      return method === "shares" ? t.vShares : t.vNobody;
    case "exact_missing":
      return t.vExactMissing(money(issue.missing));
    case "exact_excess":
      return t.vExactOver(money(issue.excess));
    case "percentage_total":
      return t.vPct(String(issue.total).replace(".", lang === "it" ? "," : "."));
  }
}

// Pure TypeScript shared by the app and the Worker (SPEC.md §9.3). No DOM, no Worker APIs.
export { splitExpense } from "./shares.ts";
export type { SplitResult } from "./shares.ts";
export { splitSchema, defaultSplitSchema } from "./split.ts";
export type { Split, SplitMethod, DefaultSplit } from "./split.ts";
export { validateExpense } from "./validate.ts";
export type { ExpenseIssue } from "./validate.ts";
export { expenseSnapshotSchema, payerSchema } from "./expense.ts";
export type { ExpenseSnapshot, Payer } from "./expense.ts";
export { CURRENT_VERSION, NAME_MAX_LENGTH, parseOperation, upcastOperation } from "./operations.ts";
export type {
  Operation,
  OperationV1,
  OperationType,
  ParseResult,
  SequencedOperation,
  StoredOperation,
} from "./operations.ts";
export { foldTrip, foldWithPending } from "./fold.ts";
export { balances, expenseShares, suggestSettlements } from "./balances.ts";
export type { Balances, SuggestedSettlement } from "./balances.ts";
export type * from "./trip.ts";
export { findDuplicateSettlement } from "./duplicates.ts";
export type { SettlementDraft } from "./duplicates.ts";
export { canRemoveParticipant } from "./references.ts";
export { STANDARD_CATEGORIES, OTHER_CATEGORY_ID, categoryColor, listCategories, resolveCategory } from "./categories.ts";
export type { CategoryColor, ResolvedCategory } from "./categories.ts";
export { tripTotals } from "./totals.ts";
export type { Totals } from "./totals.ts";
export { minorDigits } from "./money.ts";

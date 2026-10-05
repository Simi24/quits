// Pure TypeScript shared by the app and the Worker (SPEC.md §9.3). No DOM, no Worker APIs.
export { splitExpense } from "./shares.ts";
export type { SplitResult } from "./shares.ts";
export { splitSchema, defaultSplitSchema } from "./split.ts";
export type { Split, SplitMethod, DefaultSplit } from "./split.ts";
export { validateExpense } from "./validate.ts";
export type { ExpenseIssue } from "./validate.ts";
export { expenseSnapshotSchema, payerSchema } from "./expense.ts";
export type { ExpenseSnapshot, Payer } from "./expense.ts";
export { CURRENT_VERSION, parseOperation, upcastOperation } from "./operations.ts";
export type {
  Operation,
  OperationV1,
  OperationType,
  ParseResult,
  SequencedOperation,
  StoredOperation,
} from "./operations.ts";
export { foldTrip } from "./fold.ts";
export { balances, expenseShares, suggestSettlements } from "./balances.ts";
export type { Balances, SuggestedSettlement } from "./balances.ts";
export type * from "./trip.ts";
export { findDuplicateSettlement } from "./duplicates.ts";
export type { SettlementDraft } from "./duplicates.ts";
export { canRemoveParticipant } from "./references.ts";

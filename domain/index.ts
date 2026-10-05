// Pure TypeScript shared by the app and the Worker (SPEC.md §9.3). No DOM, no Worker APIs.
export { splitExpense } from "./shares.ts";
export type { SplitResult } from "./shares.ts";
export { splitSchema, defaultSplitSchema } from "./split.ts";
export type { Split, SplitMethod, DefaultSplit } from "./split.ts";

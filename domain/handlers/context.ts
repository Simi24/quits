import type { Operation } from "../operations.ts";
import type { IgnoredReason, Trip } from "../trip.ts";

export type FoldEntry = { seq: number; operation: Operation; pending: boolean };

/** What a handler sees while applying one operation. */
export type Ctx = {
  trip: Trip;
  entry: FoldEntry;
  /** True when the trip is closed as this operation is applied (SPEC.md §3.2). */
  afterClose: boolean;
  /** Marks the operation as having no effect; it stays in the history with the reason. */
  ignore: (reason: IgnoredReason) => void;
};

export type Handlers = {
  [T in Operation["type"]]?: (ctx: Ctx, op: Extract<Operation, { type: T }>) => void;
};

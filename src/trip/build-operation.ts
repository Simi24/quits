import { CURRENT_VERSION } from "../../domain";
import type { Operation } from "../../domain";

type Envelope = "id" | "v" | "by" | "device" | "at";
/** What an operation says, without who sent it and when. */
export type OperationPayload = Operation extends infer O ? (O extends Operation ? Omit<O, Envelope> : never) : never;

export interface Author {
  /** The participant making the change. */
  by: string;
  /** The anonymous device id (SPEC.md §3.13). */
  device: string;
}

/** A new operation: a client-generated id, the current schema version, the author and the client time. */
export const buildOperation = (author: Author, payload: OperationPayload, now: Date = new Date()): Operation =>
  ({ id: crypto.randomUUID(), v: CURRENT_VERSION, by: author.by, device: author.device, at: now.toISOString(), ...payload }) as Operation;

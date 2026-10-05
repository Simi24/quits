// Test helpers only: not exported from index.ts, not part of the public interface.
import type { ExpenseSnapshot, Operation, SequencedOperation, StoredOperation } from "./index.ts";

type Payload = Record<string, unknown> & { type: string };

let counter = 0;

/** Builds an operation of the current version with a fresh id; `meta` overrides the envelope. */
export function op(
  payload: Payload,
  meta: { id?: string; by?: string; device?: string; at?: string; v?: number } = {},
): Operation {
  counter += 1;
  return {
    id: meta.id ?? `op-${counter}`,
    v: meta.v ?? 2,
    by: meta.by ?? "p1",
    device: meta.device ?? "dev-1",
    at: meta.at ?? "2026-06-01T10:00:00Z",
    ...payload,
  } as Operation;
}

/** Assigns sequence numbers 1..n in array order, as the server would. */
export function sequence(operations: StoredOperation[], from = 1): SequencedOperation[] {
  return operations.map((operation, i) => ({ seq: from + i, operation }));
}

export const people = ["p1", "p2", "p3"];

export const tripCreated = (extra: Record<string, unknown> = {}, meta = {}) =>
  op(
    {
      type: "TripCreated",
      name: "Sardegna",
      currency: "EUR",
      participants: people.map((id, i) => ({ id, name: ["Simone", "Sara", "Luca"][i] })),
      from: "2026-06-13",
      to: "2026-06-20",
      defaultSplit: { method: "equal" },
      ...extra,
    },
    { id: "created", ...meta },
  );

export const expense = (extra: Partial<ExpenseSnapshot> = {}): ExpenseSnapshot => ({
  description: "Cena",
  amount: 9000,
  date: "2026-06-14",
  categoryId: "restaurants",
  payers: [{ participantId: "p1", amount: 9000 }],
  split: { method: "equal", among: people },
  ...extra,
});

export const expenseCreated = (id: string, snapshot: ExpenseSnapshot = expense(), meta = {}) =>
  op({ type: "ExpenseCreated", expenseId: id, expense: snapshot }, { id: `create-${id}`, ...meta });

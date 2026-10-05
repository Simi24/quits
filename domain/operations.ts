import { z } from "zod";
import { dateSchema, expenseSnapshotSchema } from "./expense.ts";
import { idSchema } from "./ids.ts";
import { defaultSplitSchema } from "./split.ts";
import { validateExpense } from "./validate.ts";

/** The schema version operations are written in today (SPEC.md §3.13). Older ones are upcast in the fold. */
export const CURRENT_VERSION = 2;

const name = z.string().trim().min(1).max(100);
const currency = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .refine((code) => {
    try {
      new Intl.NumberFormat("en", { style: "currency", currency: code });
      return true;
    } catch {
      return false;
    }
  });
const minorUnits = z.number().int().positive();

// Version 1 wrote the category of an expense as `category`; version 2 calls it `categoryId`.
const { categoryId: _categoryId, ...snapshotFields } = expenseSnapshotSchema.shape;
const legacyExpenseSnapshotSchema = z.strictObject({ ...snapshotFields, category: idSchema });

const validExpense = (snapshot: z.infer<typeof expenseSnapshotSchema>) =>
  validateExpense(snapshot).length === 0;

/** Every operation kind, for one schema version. `expense` is the snapshot shape of that version. */
function operationSchemaOf<V extends number, S extends z.ZodType>(v: V, expense: S) {
  const envelope = {
    id: idSchema,
    v: z.literal(v),
    /** The participant who made it. */
    by: idSchema,
    /** Anonymous device id, never shown. */
    device: idSchema,
    /** Client time. */
    at: z.iso.datetime({ offset: true }),
  };
  const kind = <T extends string, P extends z.ZodRawShape>(type: T, payload: P) =>
    z.strictObject({ ...envelope, type: z.literal(type), ...payload });
  const dates = { from: dateSchema.nullable(), to: dateSchema.nullable() };
  return z.discriminatedUnion("type", [
    kind("TripCreated", {
      name,
      currency,
      participants: z
        .array(z.strictObject({ id: idSchema, name }))
        .min(2)
        .refine((list) => new Set(list.map((p) => p.id)).size === list.length),
      ...dates,
      defaultSplit: defaultSplitSchema,
    }),
    kind("TripRenamed", { name }),
    kind("TripDatesChanged", dates),
    kind("TripCurrencyChanged", { currency }),
    kind("DefaultSplitChanged", { defaultSplit: defaultSplitSchema }),
    kind("TripClosed", {}),
    kind("TripReopened", {}),
    kind("LinkRegenerated", {}),
    kind("TripDeleted", {}),
    kind("TripRestored", {}),
    kind("ParticipantAdded", { participantId: idSchema, name }),
    kind("ParticipantRenamed", { participantId: idSchema, name }),
    kind("ParticipantRemoved", { participantId: idSchema }),
    kind("ParticipantsMerged", { fromParticipantId: idSchema, intoParticipantId: idSchema }),
    kind("MergeUndone", { mergeOpId: idSchema }),
    kind("ExpenseCreated", { expenseId: idSchema, expense }),
    kind("ExpenseEdited", { expenseId: idSchema, baseOpId: idSchema, expense }),
    kind("ExpenseDeleted", { expenseId: idSchema }),
    kind("ExpenseRestored", { expenseId: idSchema }),
    kind("SettlementRecorded", {
      settlementId: idSchema,
      fromParticipantId: idSchema,
      toParticipantId: idSchema,
      amount: minorUnits,
      date: dateSchema,
    }),
    kind("SettlementDeleted", { settlementId: idSchema }),
    kind("SettlementRestored", { settlementId: idSchema }),
    kind("CategoryAdded", { categoryId: idSchema, name, emoji: z.string().max(16) }),
    kind("CategoryRenamed", { categoryId: idSchema, name, emoji: z.string().max(16) }),
    kind("CategoryDeleted", { categoryId: idSchema }),
  ]);
}

const operationSchemaV2 = operationSchemaOf(2, expenseSnapshotSchema.refine(validExpense));
const operationSchemaV1 = operationSchemaOf(
  1,
  legacyExpenseSnapshotSchema.refine(({ category, ...rest }) =>
    validExpense({ ...rest, categoryId: category }),
  ),
);

/** A settlement is between two different participants (SPEC.md §3.9). */
const checked = <T extends z.ZodType>(schema: T) =>
  schema.refine(
    (o) => {
      const operation = o as { type: string; fromParticipantId?: string; toParticipantId?: string };
      return (
        operation.type !== "SettlementRecorded" ||
        operation.fromParticipantId !== operation.toParticipantId
      );
    },
    { path: ["toParticipantId"] },
  );

/** An operation in the current schema version. */
export type Operation = z.infer<typeof operationSchemaV2>;
/** An operation as an older client wrote it (version 1). */
export type OperationV1 = z.infer<typeof operationSchemaV1>;
/** An operation of any version the domain knows; the fold upcasts it. */
export type StoredOperation = Operation | OperationV1;
export type OperationType = Operation["type"];

export type ParseResult =
  | { ok: true; operation: StoredOperation }
  | { ok: false; reason: "malformed" | "unknown_version"; detail: string };

const knownSchemas = { 1: checked(operationSchemaV1), 2: checked(operationSchemaV2) };

/**
 * Validates an operation received from outside (the Worker's push, a JSON backup).
 * The detail names the failing fields only, never their contents, so it is safe to log and show.
 */
export function parseOperation(raw: unknown): ParseResult {
  const version = typeof raw === "object" && raw !== null ? (raw as { v?: unknown }).v : undefined;
  if (typeof version === "number" && !(version in knownSchemas)) {
    return { ok: false, reason: "unknown_version", detail: `v${version}` };
  }
  const schema = knownSchemas[version as 1 | 2] ?? knownSchemas[CURRENT_VERSION];
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, operation: parsed.data as StoredOperation };
  const detail = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.code}`).join("; ");
  return { ok: false, reason: "malformed", detail };
}

/** Brings an operation of any known version to the current shape. Never changes what it means. */
export function upcastOperation(operation: StoredOperation): Operation {
  if (operation.v === CURRENT_VERSION) return operation;
  if (operation.type === "ExpenseCreated" || operation.type === "ExpenseEdited") {
    const { category, ...rest } = operation.expense;
    return { ...operation, v: 2, expense: { ...rest, categoryId: category } };
  }
  return { ...operation, v: 2 } as Operation;
}

/** An operation with the sequence number the server gave it. */
export type SequencedOperation = { seq: number; operation: StoredOperation };

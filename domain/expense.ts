import { z } from "zod";
import { idSchema } from "./ids.ts";
import { splitSchema } from "./split.ts";

export const payerSchema = z.strictObject({
  participantId: idSchema,
  /** Minor units; negative for a refund (money received). */
  amount: z.number().int(),
});

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Everything an expense says, as carried whole by creation and every edit (SPEC.md §3.13). */
export const expenseSnapshotSchema = z.strictObject({
  description: z.string(),
  /** Minor units, signed: negative is a refund. */
  amount: z.number().int(),
  date: dateSchema,
  categoryId: idSchema,
  payers: z.array(payerSchema),
  split: splitSchema,
});

export type Payer = z.infer<typeof payerSchema>;
export type ExpenseSnapshot = z.infer<typeof expenseSnapshotSchema>;

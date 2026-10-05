import { z } from "zod";
import { idSchema } from "./ids.ts";
import { positiveMinorUnits } from "./money.ts";

const weight = z.number().int().nonnegative();
/** The weight of a percentage in the largest remainder (SPEC.md §3.7): 33.33 % weighs 3333. */
export const percentageWeight = (percentage: number): number => Math.round(percentage * 100);

/** Up to two decimals, as entered (SPEC.md §3.6). */
const percentage = z
  .number()
  .min(0)
  .max(100)
  .refine((p) => Math.abs(p * 100 - percentageWeight(p)) < 1e-9);

export const splitSchema = z.discriminatedUnion("method", [
  z.strictObject({ method: z.literal("equal"), among: z.array(idSchema) }),
  z.strictObject({ method: z.literal("exact"), amounts: z.record(idSchema, positiveMinorUnits) }),
  z.strictObject({ method: z.literal("percentage"), percentages: z.record(idSchema, percentage) }),
  z.strictObject({ method: z.literal("shares"), shares: z.record(idSchema, weight) }),
]);

export type Split = z.infer<typeof splitSchema>;
export type SplitMethod = Split["method"];

/** Everyone a split names, whatever their input (an equal split names the ones it includes). */
export function splitParticipantIds(split: Split): string[] {
  switch (split.method) {
    case "equal":
      return split.among;
    case "exact":
      return Object.keys(split.amounts);
    case "percentage":
      return Object.keys(split.percentages);
    case "shares":
      return Object.keys(split.shares);
  }
}

/** The default split a trip suggests: everyone equally, or by shares (a couple counts 2). */
export const defaultSplitSchema = z.discriminatedUnion("method", [
  z.strictObject({ method: z.literal("equal") }),
  z.strictObject({ method: z.literal("shares"), shares: z.record(idSchema, weight) }),
]);

export type DefaultSplit = z.infer<typeof defaultSplitSchema>;

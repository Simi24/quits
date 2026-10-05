import type { ExpenseSnapshot, ExpenseVersion } from "../../domain";

export type ChangedField = "description" | "amount" | "date" | "category" | "payers" | "split";

const read: Record<ChangedField, (s: ExpenseSnapshot) => unknown> = {
  description: (s) => s.description,
  amount: (s) => s.amount,
  date: (s) => s.date,
  category: (s) => s.categoryId,
  payers: (s) => s.payers,
  split: (s) => s.split,
};

/** Equal as data, whatever order the keys were written in. */
const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};

/** What an edit changed, from one version of an expense to the next (prototype `diff`). */
export const changedFields = (before: ExpenseSnapshot, after: ExpenseSnapshot): ChangedField[] =>
  (Object.keys(read) as ChangedField[]).filter((field) => !same(read[field](before), read[field](after)));

export type VersionChange = { kind: "created" } | { kind: "restored" } | { kind: "changed"; fields: ChangedField[] };

/**
 * What one version of an expense did ("Modifiche", SPEC.md §3.15): the creation, a change of some fields, or the
 * return of a version older than the one it replaced, which is how "Ripristina questa versione" reads.
 */
export function versionChange(versions: ExpenseVersion[], index: number): VersionChange {
  const version = versions[index];
  const previous = versions[index - 1];
  if (!version || !previous) return { kind: "created" };
  if (versions.slice(0, index - 1).some((v) => changedFields(v.snapshot, version.snapshot).length === 0)) return { kind: "restored" };
  return { kind: "changed", fields: changedFields(previous.snapshot, version.snapshot) };
}

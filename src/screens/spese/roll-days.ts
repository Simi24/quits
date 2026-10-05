import type { ExpenseRecord, SettlementRecord, Trip } from "../../../domain";

export interface RollDay {
  date: string;
  /** Σ live expenses of the day, refunds as negatives. */
  total: number;
  expenses: ExpenseRecord[];
  settlements: SettlementRecord[];
}

interface RollOptions {
  query: string;
  categoryNameOf: (categoryId: string) => string;
}

/**
 * The roll of Spese: live expenses and settlements grouped by day, newest first (SPEC.md §7.6 item 4).
 * Searching matches description and category name, and hides settlements.
 */
export function rollDays(trip: Trip, { query, categoryNameOf }: RollOptions): RollDay[] {
  const needle = query.trim().toLowerCase();
  const matches = (e: ExpenseRecord) =>
    needle === "" ||
    e.snapshot.description.toLowerCase().includes(needle) ||
    categoryNameOf(e.snapshot.categoryId).toLowerCase().includes(needle);
  const enteredAt = (e: ExpenseRecord) => e.versions[0]?.at ?? "";

  const days = new Map<string, RollDay>();
  const day = (date: string): RollDay => {
    const existing = days.get(date);
    if (existing) return existing;
    const created: RollDay = { date, total: 0, expenses: [], settlements: [] };
    days.set(date, created);
    return created;
  };

  for (const e of trip.expenses) {
    if (e.deleted || !matches(e)) continue;
    const d = day(e.snapshot.date);
    d.expenses.push(e);
    d.total += e.snapshot.amount;
  }
  if (needle === "") {
    for (const s of [...trip.settlements].reverse()) if (!s.deleted) day(s.date).settlements.push(s);
  }
  for (const d of days.values()) d.expenses.sort((a, b) => (enteredAt(a) < enteredAt(b) ? 1 : -1));
  return [...days.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

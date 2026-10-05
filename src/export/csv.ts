import { effectiveExpense, expenseShares, minorDigits, resolveCategory } from "../../domain";
import type { Trip } from "../../domain";
import type { Locale } from "../format";

const FIXED_COLUMNS = ["date", "description", "category", "type", "amount", "currency", "split"];

/** Major units with a dot, whatever the interface language: a spreadsheet reads it the same everywhere. */
const decimal = (minor: number, digits: number) => (minor / 10 ** digits).toFixed(digits);

/** A cell that starts like a formula is read as text, not run. Numbers are written by us and never pass here. */
const textCell = (value: string) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

const quote = (cell: string) => (/[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell);

/**
 * The live expenses as CSV (SPEC.md §3.1 export, G-B6): one row per expense, by date then order of entry, with
 * what each participant paid and owes. Amounts are decimal, refunds negative, merges applied.
 */
export function buildExpensesCsv(trip: Trip, lang: Locale): string {
  const digits = minorDigits(trip.currency);
  const people = trip.participants;
  const header = [...FIXED_COLUMNS, ...people.map((p) => textCell(`paid ${p.name}`)), ...people.map((p) => textCell(`share ${p.name}`))];
  const rows = trip.expenses
    .filter((e) => !e.deleted)
    .map((e, order) => ({ e, order }))
    .sort((a, b) => a.e.snapshot.date.localeCompare(b.e.snapshot.date) || a.order - b.order)
    .map(({ e }) => {
      const { snapshot } = e;
      const category = resolveCategory(trip, snapshot.categoryId);
      const { payers, split } = effectiveExpense(trip, snapshot);
      const shares = expenseShares(trip, e).shares;
      return [
        snapshot.date,
        textCell(snapshot.description),
        textCell(category.name ?? category.names?.[lang] ?? ""),
        snapshot.amount < 0 ? "refund" : "expense",
        decimal(snapshot.amount, digits),
        trip.currency,
        split.method,
        ...people.map((p) => decimal(payers.find((x) => x.participantId === p.id)?.amount ?? 0, digits)),
        ...people.map((p) => decimal(shares[p.id] ?? 0, digits)),
      ];
    });
  return [header, ...rows].map((row) => row.map(quote).join(",")).join("\r\n") + "\r\n";
}

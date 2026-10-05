// Test helpers only: not exported from index.ts.
import { foldTrip } from "../fold.ts";
import type { Operation, Trip } from "../index.ts";
import { sardegnaOperations } from "../sardegna.fixture.ts";
import { expense, expenseCreated, op, sequence, tripCreated } from "../testing.ts";

type Created = Extract<Operation, { type: "ExpenseCreated" }>;

/** The Sardegna trip with only the expenses dated up to `until` (the prototype's "today" moves the same way). */
export function sardegnaUntil(until = "9999-12-31"): Trip {
  const operations = sardegnaOperations().filter((o) => o.type !== "ExpenseCreated" || (o as Created).expense.date <= until);
  return foldTrip(sequence(operations));
}

/** A small trip with the dates and expenses given. */
export function tripWith(
  dates: { from: string | null; to: string | null },
  expenses: { id: string; date: string; amount: number; categoryId?: string; payer?: string }[],
  extra: Operation[] = [],
): Trip {
  return foldTrip(
    sequence([
      tripCreated(dates),
      ...extra,
      ...expenses.map((e) =>
        expenseCreated(
          e.id,
          expense({
            date: e.date,
            amount: e.amount,
            categoryId: e.categoryId ?? "restaurants",
            payers: [{ participantId: e.payer ?? "p1", amount: e.amount }],
          }),
        ),
      ),
    ]),
  );
}

export { op };

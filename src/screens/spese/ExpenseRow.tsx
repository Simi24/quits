import { CategoryDot } from "../../components";
import { useDevice } from "../../device";
import { expenseShares, resolveCategory } from "../../../domain";
import type { ExpenseRecord } from "../../../domain";
import { useTrip } from "../../trip";

interface ExpenseRowProps {
  expense: ExpenseRecord;
  printing: boolean;
  onOpen: () => void;
}

/** One row of the day's receipt: category dot, description, who paid, amount and your share. */
export const ExpenseRow = ({ expense, printing, onOpen }: ExpenseRowProps) => {
  const { t } = useDevice();
  const { trip, meId, money, nameOf } = useTrip();
  const { snapshot } = expense;
  const category = resolveCategory(trip, snapshot.categoryId);
  const mine = expenseShares(trip, expense).shares[meId];
  const refund = snapshot.amount < 0;
  const first = nameOf(snapshot.payers[0]?.participantId ?? "");
  const who =
    snapshot.payers.length > 1 ? t.expenses.paidByMany(first, snapshot.payers.length - 1) : refund ? t.expenses.receivedBy(first) : t.expenses.paidBy(first);
  const sentence = who.charAt(0).toUpperCase() + who.slice(1);

  return (
    <li className={printing ? "anim-print" : ""}>
      <button
        type="button"
        onClick={onOpen}
        data-testid="expense-row"
        className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left text-ink -outline-offset-[5px]"
      >
        <CategoryDot color={category.color}>{category.emoji}</CategoryDot>
        <span className="min-w-0">
          <span className="block truncate text-base leading-tight font-bold">{snapshot.description}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13.5px] text-ink-2">
            {refund ? <span className="flex-none rounded-full bg-[color-mix(in_srgb,var(--pool)_22%,var(--receipt))] px-2 text-[12.5px] font-bold text-ink">{t.expenses.refund}</span> : null}
            <span className="truncate">{sentence}</span>
          </span>
        </span>
        <span className="num text-right">
          <b className="block text-[17px] font-bold">{money(snapshot.amount)}</b>
          <small className="block text-[13px] text-ink-2">{mine !== undefined ? t.expenses.yourShare(money(mine)) : t.expenses.notYours}</small>
        </span>
      </button>
    </li>
  );
};

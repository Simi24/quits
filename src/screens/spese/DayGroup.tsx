import { Receipt } from "../../components";
import { useDevice } from "../../device";
import { dayLabel } from "../../format";
import { useTrip } from "../../trip";
import { ExpenseRow } from "./ExpenseRow";
import type { RollDay } from "./roll-days";
import { SettlementTicket } from "./SettlementTicket";

interface DayGroupProps {
  day: RollDay;
  printId: string | null;
  onPrinted: () => void;
  onOpenExpense: (id: string) => void;
  onOpenSettlement: (id: string) => void;
}

/**
 * One day of the roll: its date and total, then one receipt with the day's expenses as rows
 * separated by dotted rules, then the day's settlements as tickets (SPEC.md §7.6 item 4, changed by #9).
 */
export const DayGroup = ({ day, printId, onPrinted, onOpenExpense, onOpenSettlement }: DayGroupProps) => {
  const { lang } = useDevice();
  const { money } = useTrip();
  return (
    <section className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3 px-1 pt-[18px]">
        <h2 className="display text-[calc(19px*var(--d-scale))]">{dayLabel(day.date, lang)}</h2>
        {day.expenses.length ? <span className="num text-sm text-ink-2">{money(day.total)}</span> : null}
      </div>
      {day.expenses.length ? (
        <Receipt>
          <ul className="my-2.5 [&>li+li]:border-t-2 [&>li+li]:border-dotted [&>li+li]:border-line">
            {day.expenses.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} printing={printId === expense.id} onPrinted={onPrinted} onOpen={() => onOpenExpense(expense.id)} />
            ))}
          </ul>
        </Receipt>
      ) : null}
      {day.settlements.map((settlement) => (
        <SettlementTicket key={settlement.id} settlement={settlement} onOpen={() => onOpenSettlement(settlement.id)} />
      ))}
    </section>
  );
};

import { Receipt } from "../../components";
import { useDevice } from "../../device";
import { expenseShares } from "../../../domain";
import { useTrip } from "../../trip";

/** "Spesi finora" and "La tua parte" on one receipt (SPEC.md §7.6 item 4). */
export const SummaryReceipt = () => {
  const { t } = useDevice();
  const { trip, meId, money } = useTrip();
  const live = trip.expenses.filter((e) => !e.deleted);
  const total = live.reduce((sum, e) => sum + e.snapshot.amount, 0);
  const mine = live.reduce((sum, e) => sum + (expenseShares(trip, e).shares[meId] ?? 0), 0);
  return (
    <Receipt className="grid grid-cols-2 px-[18px] pt-[22px] pb-6">
      <div>
        <small className="block text-[13.5px] text-ink-2">{t.expenses.spentSoFar}</small>
        <b className="num display block text-[calc(26px*var(--d-scale))] leading-[1.15]">{money(total)}</b>
      </div>
      <div className="border-l-2 border-dashed border-line pl-4">
        <small className="block text-[13.5px] text-ink-2">{t.expenses.yourPart}</small>
        <b className="num display block text-[calc(26px*var(--d-scale))] leading-[1.15]">{money(mine)}</b>
      </div>
    </Receipt>
  );
};

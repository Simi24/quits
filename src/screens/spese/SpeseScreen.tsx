import { Receipt as ReceiptIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Receipt } from "../../components";
import { useDevice } from "../../device";
import { resolveCategory } from "../../../domain";
import { categoryName, useTrip } from "../../trip";
import { DayGroup } from "./DayGroup";
import { rollDays } from "./roll-days";
import { SearchField } from "./SearchField";
import { SummaryReceipt } from "./SummaryReceipt";

interface SpeseScreenProps {
  printId: string | null;
  onOpenExpense: (id: string) => void;
  onOpenSettlement: (id: string) => void;
}

/** The roll of receipts: summary, search, days newest first (SPEC.md §7.6 item 4). */
export const SpeseScreen = ({ printId, onOpenExpense, onOpenSettlement }: SpeseScreenProps) => {
  const { t, lang } = useDevice();
  const { trip } = useTrip();
  const [query, setQuery] = useState("");
  const days = useMemo(
    () => rollDays(trip, { query, categoryNameOf: (id) => categoryName(resolveCategory(trip, id), lang) }),
    [trip, query, lang],
  );
  // A payment recorded before any expense still belongs on the roll: it is the only place to open it.
  const emptyRoll = !trip.expenses.some((e) => !e.deleted) && !trip.settlements.some((s) => !s.deleted);

  return (
    <div className="grid gap-3.5 px-4 pt-1.5 pb-24">
      <SummaryReceipt />
      <SearchField value={query} onChange={setQuery} />
      {emptyRoll ? (
        <div className="grid justify-items-center gap-2.5 px-5 py-8 text-center">
          <Receipt className="grid h-[90px] w-[120px] place-items-center">
            <ReceiptIcon size={34} weight="fill" aria-hidden="true" />
          </Receipt>
          <b>{t.expenses.emptyRoll}</b>
          <p className="text-sm text-ink-2">{t.expenses.emptyRollHelp}</p>
        </div>
      ) : query && days.length === 0 ? (
        <p className="px-5 py-8 text-center text-ink-2">{t.expenses.noResults(query)}</p>
      ) : (
        <div className="grid gap-2">
          {days.map((day) => (
            <DayGroup key={day.date} day={day} printId={printId} onOpenExpense={onOpenExpense} onOpenSettlement={onOpenSettlement} />
          ))}
        </div>
      )}
    </div>
  );
};

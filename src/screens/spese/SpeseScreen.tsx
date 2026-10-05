import { ClockCounterClockwise, Receipt as ReceiptIcon, Warning } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button, EmptyState, IconButton } from "../../components";
import { useDevice } from "../../device";
import { resolveCategory } from "../../../domain";
import { categoryName, unseenConflicts, useTrip } from "../../trip";
import { DayGroup } from "./DayGroup";
import { rollDays } from "./roll-days";
import { SearchField } from "./SearchField";
import { SummaryReceipt } from "./SummaryReceipt";

interface SpeseScreenProps {
  printId: string | null;
  onPrinted: () => void;
  onOpenExpense: (id: string) => void;
  onOpenSettlement: (id: string) => void;
  onOpenHistory: () => void;
}

/** The roll of receipts: summary, search, days newest first (SPEC.md §7.6 item 4). */
export const SpeseScreen = ({ printId, onPrinted, onOpenExpense, onOpenSettlement, onOpenHistory }: SpeseScreenProps) => {
  const { t, lang } = useDevice();
  const { trip, seenConflicts, readOnly } = useTrip();
  const [query, setQuery] = useState("");
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const conflicts = useMemo(() => unseenConflicts(trip, seenConflicts), [trip, seenConflicts]);
  // Once the last conflict is dismissed there is nothing left to filter to.
  const filtering = onlyConflicts && conflicts.length > 0;
  const days = useMemo(
    () => rollDays(trip, {
        query,
        categoryNameOf: (id) => categoryName(resolveCategory(trip, id), lang),
        onlyIds: filtering ? new Set(conflicts.map((e) => e.id)) : undefined,
      }),
    [trip, query, lang, filtering, conflicts],
  );
  // A payment recorded before any expense still belongs on the roll: it is the only place to open it.
  const emptyRoll = !trip.expenses.some((e) => !e.deleted) && !trip.settlements.some((s) => !s.deleted);

  return (
    <div className="grid gap-3.5 px-4 pt-1.5 pb-24">
      {/* At the top of Spese, before the summary: it is what changed while you were away (SPEC.md §7.6 item 7). */}
      {conflicts.length ? (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 rounded-[14px] bg-[color-mix(in_srgb,var(--sun)_34%,var(--paper))] p-3.5 text-[14.5px]" data-testid="conflict-banner">
          <Warning size={20} weight="fill" className="mt-0.5" aria-hidden="true" />
          <div className="grid justify-items-start gap-2.5">
            <b>{t.history.conflicts(conflicts.length)}</b>
            <Button size="sm" variant="ghost" onClick={() => setOnlyConflicts(!filtering)}>
              {filtering ? t.history.conflictsAll : t.history.conflictsShow}
            </Button>
          </div>
        </div>
      ) : null}
      <SummaryReceipt />
      <div className="flex items-center gap-2">
        <div className="min-w-0 grow">
          <SearchField value={query} onChange={setQuery} />
        </div>
        <IconButton label={t.history.open} onClick={onOpenHistory}>
          <ClockCounterClockwise size={24} weight="bold" aria-hidden="true" />
        </IconButton>
      </div>
      {emptyRoll ? (
        <EmptyState
          icon={<ReceiptIcon size={34} weight="fill" aria-hidden="true" />}
          title={readOnly ? t.onboarding.emptyRollClosed : t.expenses.emptyRoll}
          help={readOnly ? t.onboarding.emptyRollClosedHelp : t.expenses.emptyRollHelp}
        />
      ) : query && days.length === 0 ? (
        <p className="px-5 py-8 text-center text-ink-2">{t.expenses.noResults(query)}</p>
      ) : (
        <div className="grid gap-2">
          {days.map((day) => (
            <DayGroup key={day.date} day={day} printId={printId} onPrinted={onPrinted} onOpenExpense={onOpenExpense} onOpenSettlement={onOpenSettlement} />
          ))}
        </div>
      )}
    </div>
  );
};

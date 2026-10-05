import { useMemo } from "react";
import { Overlay } from "../../components";
import { useDevice } from "../../device";
import { historyItems } from "../../history";
import type { HistoryAction } from "../../history";
import { useMergeUndo, useTrip } from "../../trip";
import { HistoryRow } from "./HistoryRow";

interface HistoryOverlayProps {
  onClose: () => void;
  notify: (text: string) => void;
}

/** The history overlay: every operation in order, restore of what was deleted, undo of a merge (SPEC.md §7.6 item 13, §3.15). */
export const HistoryOverlay = ({ onClose, notify }: HistoryOverlayProps) => {
  const { t } = useDevice();
  const { trip, operations, rejected, record } = useTrip();
  const { undo } = useMergeUndo();
  const items = useMemo(() => historyItems(trip, operations, rejected), [trip, operations, rejected]);

  const act = async (action: HistoryAction) => {
    if (action.kind === "restore-expense") {
      await record({ type: "ExpenseRestored", expenseId: action.expenseId });
      notify(t.expenses.restoredExp);
    } else if (action.kind === "restore-settlement") {
      await record({ type: "SettlementRestored", settlementId: action.settlementId });
      notify(t.balances.setRestored);
    } else {
      await undo(action.mergeOpId);
      notify(t.history.mergeUndone);
    }
  };

  return (
    <Overlay title={t.history.title} onClose={onClose}>
      <div className="px-4 pt-1 pb-8">
        <p className="mb-1.5 text-[13.5px] text-ink-2">{t.history.help}</p>
        {items.length ? (
          <ol data-testid="history-list">
            {items.map((item) => (
              <HistoryRow key={item.id} item={item} onAct={(a) => void act(a)} />
            ))}
          </ol>
        ) : (
          <p className="py-8 text-center text-ink-2">{t.history.empty}</p>
        )}
      </div>
    </Overlay>
  );
};

import { Button, Notice } from "../../components";
import { useDevice } from "../../device";
import type { ExpenseRecord } from "../../../domain";
import { isUnseenConflict, useTrip } from "../../trip";

/**
 * Two edits made without knowledge of each other: the one the server sequenced last wins on the whole
 * expense, the other stays restorable (SPEC.md §3.14).
 */
export const ConflictNotice = ({ expense }: { expense: ExpenseRecord }) => {
  const { t } = useDevice();
  const { meId, nameOf, money, record, dismissConflict, readOnly, seenConflicts } = useTrip();
  const { conflict } = expense;
  if (!conflict || !isUnseenConflict(expense, seenConflicts)) return null;

  const winner = expense.versions.find((v) => v.opId === conflict.winnerOpId);
  const losers = conflict.loserOpIds.flatMap((id) => expense.versions.filter((v) => v.opId === id));
  const loser = losers.find((v) => v.by === meId) ?? losers.at(-1);
  if (!winner || !loser) return null;
  const mine = loser.by === meId;

  const restore = async () => {
    await record({ type: "ExpenseEdited", expenseId: expense.id, baseOpId: conflict.winnerOpId, expense: loser.snapshot });
  };
  const summary = (snapshot: typeof winner.snapshot) => `${snapshot.description}, ${money(snapshot.amount)}`;

  return (
    <Notice>
      <div className="grid gap-2" data-testid="conflict-notice">
        <p>
          <b>{mine ? t.sync.conflictMine(nameOf(winner.by)) : t.sync.conflictOther(nameOf(loser.by), nameOf(winner.by))}</b> {t.sync.conflictWin(nameOf(winner.by))}
        </p>
        <p className="text-[13.5px]">
          <b>{mine ? t.sync.yourVersion : t.sync.otherVersion(nameOf(loser.by))}:</b> {summary(loser.snapshot)}
        </p>
        <p className="text-[13.5px]">
          <b>{t.sync.otherVersion(nameOf(winner.by))}:</b> {summary(winner.snapshot)}
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          {readOnly ? null : (
            <Button size="sm" onClick={() => void restore()}>
              {mine ? t.sync.restoreMine : t.sync.restoreOther}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => void dismissConflict(conflict.winnerOpId)}>
            {t.sync.keepIt}
          </Button>
        </div>
      </div>
    </Notice>
  );
};

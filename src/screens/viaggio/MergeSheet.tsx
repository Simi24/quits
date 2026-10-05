import { useMemo, useState } from "react";
import { Button, Chip, Sheet, useSingleFlight } from "../../components";
import { useDevice } from "../../device";
import { summarizeMerge } from "../../merge";
import { useTrip } from "../../trip";

interface MergeSheetProps {
  /** The participant who goes: X in "Unisci X in Y". */
  fromId: string;
  onClose: () => void;
  onMerged: (fromName: string, intoName: string) => void;
}

/** "Unisci X in Y": the survivor is picked, a summary says what changes, then it is confirmed (SPEC.md §3.3). */
export const MergeSheet = ({ fromId, onClose, onMerged }: MergeSheetProps) => {
  const { t } = useDevice();
  const { trip, operations, record, money, nameOf } = useTrip();
  const candidates = trip.participants.filter((p) => p.id !== fromId);
  const [intoId, setIntoId] = useState(candidates[0]?.id ?? "");
  const summary = useMemo(() => (intoId ? summarizeMerge(operations, fromId, intoId) : null), [operations, fromId, intoId]);
  const x = nameOf(fromId);
  const y = nameOf(intoId);

  const merge = useSingleFlight(async () => {
    if (!intoId) return;
    await record({ type: "ParticipantsMerged", fromParticipantId: fromId, intoParticipantId: intoId });
    onMerged(x, y);
  });

  return (
    <Sheet
      title={t.manage.mergeTitle(x)}
      onClose={onClose}
      footer={
        <Button wide disabled={!intoId || merge.busy} onClick={() => void merge.run()}>
          {t.manage.mergeCta(x, y)}
        </Button>
      }
    >
      <div className="grid gap-4 px-4 pt-1 pb-5">
        <fieldset className="grid gap-2.5">
          <legend className="mb-2.5 text-sm font-semibold">{t.manage.mergeWho(x)}</legend>
          <div className="flex flex-wrap gap-2">
            {candidates.map((p) => (
              <Chip key={p.id} pressed={p.id === intoId} onClick={() => setIntoId(p.id)}>
                {p.name}
              </Chip>
            ))}
          </div>
        </fieldset>
        {summary ? (
          <ul className="grid gap-2 text-[15px]" data-testid="merge-summary">
            <li>{t.manage.mergeIntro(x, y)}</li>
            <li>{t.manage.mergeExpenses(summary.expenses)}</li>
            {summary.expensesWithBoth > 0 ? <li>{t.manage.mergeBoth(summary.expensesWithBoth, y)}</li> : null}
            <li>{t.manage.mergeSettlements(summary.settlements)}</li>
            <li>{t.manage.mergeBalance(y, money(summary.balanceBefore, { signed: true }), money(summary.balanceAfter, { signed: true }))}</li>
            {summary.defaultSharesAfter !== null ? <li>{t.manage.mergeShares(y, summary.defaultSharesAfter)}</li> : null}
            <li>{t.manage.mergeOrder(y)}</li>
            <li>{t.manage.mergeDevices(x, y)}</li>
            <li className="text-ink-2">{t.manage.mergeUndo}</li>
          </ul>
        ) : null}
      </div>
    </Sheet>
  );
};

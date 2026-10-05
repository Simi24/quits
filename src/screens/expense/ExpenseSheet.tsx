import { useMemo, useState } from "react";
import { Button, ErrorLine, Segmented, Sheet, TextField, useSingleFlight } from "../../components";
import { useDevice } from "../../device";
import { draftFromSnapshot, evaluateDraft, isLiveIssue, issueMessage, newDraft } from "../../expense-draft";
import type { ExpenseDraft } from "../../expense-draft";
import { todayIso } from "../../format";
import type { ExpenseRecord } from "../../../domain";
import { useTrip } from "../../trip";
import { AmountField } from "./AmountField";
import { CategoryChips } from "./CategoryChips";
import { PayersField } from "./PayersField";
import { SplitField } from "./SplitField";

interface ExpenseSheetProps {
  /** The expense being edited; null for a new one. */
  editing: ExpenseRecord | null;
  onClose: () => void;
  /** Called after the operation is written, with the expense id and whether it is new. */
  onSaved: (expenseId: string, created: boolean) => void;
}

/** Add or edit an expense: kind, description, amount, date, category, payers, split (SPEC.md §7.6 item 5). */
export const ExpenseSheet = ({ editing, onClose, onSaved }: ExpenseSheetProps) => {
  const { t, lang } = useDevice();
  const { trip, meId, record, money } = useTrip();
  const ctx = useMemo(() => ({ currency: trip.currency, locale: lang, participants: trip.participants }), [trip.currency, lang, trip.participants]);
  const [draft, setDraft] = useState<ExpenseDraft>(() =>
    editing ? draftFromSnapshot(editing.snapshot, ctx) : newDraft(ctx, meId, trip.defaultSplit, todayIso()),
  );
  const [tried, setTried] = useState(false);
  const evaluation = useMemo(() => evaluateDraft(draft, ctx), [draft, ctx]);

  const change = (changes: Partial<ExpenseDraft>) => setDraft((d) => ({ ...d, ...changes }));
  const refund = draft.kind === "refund";
  const shown = evaluation.issues.filter((issue) => tried || isLiveIssue(issue));
  const paid = evaluation.snapshot.payers.reduce((sum, p) => sum + Math.abs(p.amount), 0);
  const title = editing ? t.expenses.editExpense : t.expenses.newExpense;

  const saving = useSingleFlight(async () => {
    if (evaluation.issues.length) {
      setTried(true);
      return;
    }
    if (editing) {
      const baseOpId = editing.versions.at(-1)?.opId;
      if (!baseOpId) return;
      await record({ type: "ExpenseEdited", expenseId: editing.id, baseOpId, expense: evaluation.snapshot });
      onSaved(editing.id, false);
      return;
    }
    const expenseId = crypto.randomUUID();
    await record({ type: "ExpenseCreated", expenseId, expense: evaluation.snapshot });
    onSaved(expenseId, true);
  });

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          <div aria-live="polite" className="grid gap-1.5">
            {shown.map((issue) => (
              <ErrorLine key={issue.code}>{issueMessage(issue, draft.method, t.expenses, money, lang)}</ErrorLine>
            ))}
          </div>
          <Button wide disabled={saving.busy} onClick={() => void saving.run()}>
            {editing ? t.expenses.saveEdit : t.expenses.save}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-1 gap-5 px-4 pt-1.5 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          void saving.run();
        }}
      >
        <Segmented<ExpenseDraft["kind"]>
          label={t.expenses.kExpense}
          value={draft.kind}
          onChange={(kind) => change({ kind })}
          options={[
            { value: "expense", label: t.expenses.kExpense },
            { value: "refund", label: t.expenses.kRefund },
          ]}
        />
        {refund ? <p className="-mt-2.5 text-[13.5px] text-ink-2">{t.expenses.refundHelp}</p> : null}
        <TextField
          id="expense-description"
          label={refund ? t.expenses.whatRefund : t.expenses.what}
          placeholder={t.expenses.whatPh}
          value={draft.description}
          onChange={(event) => change({ description: event.target.value })}
          autoComplete="off"
        />
        <AmountField id="expense-amount" label={t.expenses.amount} value={draft.amount} currency={trip.currency} negative={refund} onChange={(amount) => change({ amount })} />
        <TextField id="expense-date" type="date" label={t.expenses.date} value={draft.date} onChange={(event) => change({ date: event.target.value })} />
        <CategoryChips value={draft.categoryId} onChange={(categoryId) => change({ categoryId })} />
        <PayersField draft={draft} paid={paid} total={Math.abs(evaluation.snapshot.amount)} onChange={change} />
        <SplitField draft={draft} evaluation={evaluation} onChange={change} />
      </form>
    </Sheet>
  );
};

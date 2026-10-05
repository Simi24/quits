import { Segmented } from "../../components";
import { useDevice } from "../../device";
import type { Evaluation, ExpenseDraft } from "../../expense-draft";
import { listNames } from "../../format";
import type { SplitMethod } from "../../../domain";
import { useTrip } from "../../trip";
import { SplitRow } from "./SplitRow";

interface SplitFieldProps {
  draft: ExpenseDraft;
  evaluation: Evaluation;
  onChange: (changes: Partial<ExpenseDraft>) => void;
}

/** The four split methods, each person's control and live result, the leftover note (SPEC.md §3.6, §3.7). */
export const SplitField = ({ draft, evaluation, onChange }: SplitFieldProps) => {
  const { t, lang } = useDevice();
  const { trip, nameOf } = useTrip();
  const { result } = evaluation;
  const leftover = result?.leftover ?? [];

  const info = (() => {
    if (draft.method === "shares") return t.expenses.sharesSum(Object.values(draft.shares).reduce((a, b) => a + b, 0));
    if (evaluation.issues.some((i) => i.code.startsWith("exact_") || i.code === "percentage_total")) return "";
    if (draft.method === "exact" && result) return t.expenses.okSum;
    if (draft.method === "percentage") return t.expenses.pctSum(100);
    return "";
  })();

  return (
    <div className="grid gap-2.5">
      <span className="text-sm font-semibold">{t.expenses.split}</span>
      <Segmented<SplitMethod>
        label={t.expenses.split}
        value={draft.method}
        onChange={(method) => onChange({ method, fromDefault: false })}
        options={[
          { value: "equal", label: t.expenses.mEqual },
          { value: "exact", label: t.expenses.mExact },
          { value: "percentage", label: t.expenses.mPct },
          { value: "shares", label: t.expenses.mShares },
        ]}
      />
      {draft.fromDefault && draft.method === "shares" ? <small className="text-[13.5px] text-ink-2">{t.expenses.fromDefault}</small> : null}
      {draft.method === "equal" ? (
        <div className="flex justify-end">
          <button type="button" onClick={() => onChange({ among: trip.participants.map((p) => p.id) })} className="min-h-11 min-w-11 text-sm font-semibold underline decoration-ink-2 decoration-[1.5px] underline-offset-[3px]">
            {t.expenses.everyone}
          </button>
        </div>
      ) : null}
      <ul className="grid gap-0.5">
        {trip.participants.map((p) => (
          <SplitRow key={p.id} participant={p} draft={draft} share={result?.shares[p.id]} gotLeftover={leftover.includes(p.id)} onChange={onChange} />
        ))}
      </ul>
      <p className="text-[13.5px] text-ink-2" aria-live="polite">
        {info}
      </p>
      {result ? (
        <p className="text-sm" data-testid="leftover-note">
          {t.expenses.leftoverNote(leftover.length, listNames(leftover.map(nameOf), lang))}
        </p>
      ) : null}
    </div>
  );
};

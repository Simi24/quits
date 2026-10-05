import { Chip } from "../../components";
import { useDevice } from "../../device";
import type { ExpenseDraft } from "../../expense-draft";
import { useTrip } from "../../trip";

interface PayersFieldProps {
  draft: ExpenseDraft;
  /** Σ of what the payers entered and the total, in minor units, for the running line under several payers. */
  paid: number;
  total: number;
  onChange: (changes: Partial<ExpenseDraft>) => void;
}

/** One payer as chips, or an amount per person when several paid (SPEC.md §3.5, §7.6 item 5). */
export const PayersField = ({ draft, paid, total, onChange }: PayersFieldProps) => {
  const { t } = useDevice();
  const { trip, money } = useTrip();
  const refund = draft.kind === "refund";
  const running = total <= 0 ? "" : paid === total ? t.expenses.okSum : paid < total ? t.expenses.remaining(money(total - paid)) : t.expenses.vPayOver(money(paid - total));

  return (
    <div className="grid gap-2.5">
      <span className="text-sm font-semibold">{refund ? t.expenses.receivedByL : t.expenses.paidByL}</span>
      {draft.multiPayer ? (
        <>
          <ul className="grid gap-0.5">
            {trip.participants.map((p) => (
              <li key={p.id} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_130px] items-center gap-2.5">
                <label htmlFor={`payer-${p.id}`} className="truncate font-semibold">
                  {p.name}
                </label>
                <input
                  id={`payer-${p.id}`}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={draft.payerAmounts[p.id] ?? ""}
                  onChange={(event) => onChange({ payerAmounts: { ...draft.payerAmounts, [p.id]: event.target.value } })}
                  className="num min-h-[46px] w-full rounded-[14px] border-[1.5px] border-line bg-receipt px-2.5 py-1.5 text-right focus:border-ink focus:outline-none"
                />
              </li>
            ))}
          </ul>
          <p className="num text-[13.5px] text-ink-2" aria-live="polite">
            {running}
          </p>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {trip.participants.map((p) => (
            <Chip key={p.id} pressed={draft.payer === p.id} onClick={() => onChange({ payer: p.id })}>
              {p.name}
            </Chip>
          ))}
        </div>
      )}
      <button type="button" onClick={() => onChange({ multiPayer: !draft.multiPayer })} className="min-h-11 justify-self-start text-sm font-semibold underline decoration-ink-2 decoration-[1.5px] underline-offset-[3px]">
        {draft.multiPayer ? t.expenses.onePaid : t.expenses.manyPaid}
      </button>
    </div>
  );
};

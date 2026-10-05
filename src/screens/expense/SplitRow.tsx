import { Check } from "@phosphor-icons/react";
import { Stepper } from "../../components";
import { useDevice } from "../../device";
import type { ExpenseDraft } from "../../expense-draft";
import { useTrip } from "../../trip";

interface SplitRowProps {
  participant: { id: string; name: string };
  draft: ExpenseDraft;
  /** This person's share in minor units, or undefined when the split does not give them one. */
  share: number | undefined;
  /** The leftover cent landed here. */
  gotLeftover: boolean;
  onChange: (changes: Partial<ExpenseDraft>) => void;
}

const FIELD = "num min-h-[46px] w-full rounded-[14px] border-[1.5px] border-line bg-receipt px-2.5 py-1.5 text-right focus:border-ink focus:outline-none";

/** One person of the split: the control for the method, and what it comes to, live (SPEC.md §7.6 item 5). */
export const SplitRow = ({ participant, draft, share, gotLeftover, onChange }: SplitRowProps) => {
  const { t, lang } = useDevice();
  const { money } = useTrip();
  const { id, name } = participant;
  const sign = draft.kind === "refund" ? -1 : 1;

  const control = (() => {
    switch (draft.method) {
      case "equal": {
        const included = draft.among.includes(id);
        return (
          <button
            type="button"
            aria-pressed={included}
            aria-label={name}
            onClick={() => onChange({ among: included ? draft.among.filter((x) => x !== id) : [...draft.among, id] })}
            className="grid size-11 place-items-center justify-self-end rounded-[9px]"
          >
            <span className={`grid size-[30px] place-items-center rounded-[9px] border-2 ${included ? "border-ink bg-ink text-receipt" : "border-ink-2"}`}>
              <Check size={18} weight="bold" className={included ? "" : "invisible"} aria-hidden="true" />
            </span>
          </button>
        );
      }
      case "shares":
        return <Stepper label={name} value={draft.shares[id] ?? 0} onChange={(value) => onChange({ shares: { ...draft.shares, [id]: value } })} />;
      case "exact":
        return (
          <input
            inputMode="decimal"
            autoComplete="off"
            aria-label={name}
            placeholder="0"
            value={draft.exact[id] ?? ""}
            onChange={(event) => onChange({ exact: { ...draft.exact, [id]: event.target.value } })}
            className={FIELD}
          />
        );
      case "percentage":
        return (
          <input
            inputMode="decimal"
            autoComplete="off"
            aria-label={`${name} %`}
            placeholder="0 %"
            value={draft.percent[id] ?? ""}
            onChange={(event) => onChange({ percent: { ...draft.percent, [id]: event.target.value } })}
            className={FIELD}
          />
        );
    }
  })();

  return (
    <li className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_112px_92px] items-center gap-2.5">
      <span className="truncate font-semibold">{name}</span>
      {control}
      <span className="num text-right text-[15px]" data-testid={`share-${name}`}>
        {share !== undefined ? (
          <>
            {money(share)}
            {gotLeftover ? <small className="block text-xs font-bold text-pos">{`${sign < 0 ? "-" : "+"}${money(1)}`}</small> : null}
          </>
        ) : (
          <span className="text-ink-2" aria-label={lang === "it" ? "nessuna parte" : "no share"}>
            -
          </span>
        )}
      </span>
    </li>
  );
};

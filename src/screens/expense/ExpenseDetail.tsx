import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, CategoryDot, Notice, Overlay, Receipt } from "../../components";
import { useDevice } from "../../device";
import { dayLabel, listNames } from "../../format";
import { expenseShares, resolveCategory } from "../../../domain";
import type { ExpenseRecord, SplitMethod } from "../../../domain";
import { categoryName, useTrip } from "../../trip";
import { ConflictNotice } from "./ConflictNotice";
import { DetailRow } from "./DetailRow";

interface ExpenseDetailProps {
  expense: ExpenseRecord;
  onClose: () => void;
  onEdit: () => void;
  /** Called once the delete is recorded, so the shell can offer "Annulla". */
  onDeleted: (expenseId: string) => void;
}

/** The receipt of one expense: category, date, amount, payers, split with each share, the leftover note (SPEC.md §7.6 item 6). */
export const ExpenseDetail = ({ expense, onClose, onEdit, onDeleted }: ExpenseDetailProps) => {
  const { t, lang } = useDevice();
  const { trip, money, nameOf, record, readOnly } = useTrip();
  const [confirming, setConfirming] = useState(false);
  const { snapshot } = expense;
  const category = resolveCategory(trip, snapshot.categoryId);
  const { shares, leftover } = expenseShares(trip, expense);
  const refund = snapshot.amount < 0;
  const { split } = snapshot;

  const methodLabel: Record<SplitMethod, string> = {
    equal: `${t.expenses.mEqualL} (${split.method === "equal" ? split.among.length : 0})`,
    exact: t.expenses.mExactL,
    percentage: t.expenses.mPctL,
    shares: t.expenses.mSharesL,
  };
  const inputOf = (id: string): string => {
    if (split.method === "percentage") return `${String(split.percentages[id] ?? 0).replace(".", lang === "it" ? "," : ".")}%`;
    if (split.method === "shares") return t.expenses.shares(split.shares[id] ?? 0);
    return "";
  };

  const remove = async () => {
    await record({ type: "ExpenseDeleted", expenseId: expense.id });
    onDeleted(expense.id);
  };

  return (
    <Overlay title={t.expenses.detail} onClose={onClose}>
      <div className="grid gap-3.5 px-4 pt-1 pb-8">
        <ConflictNotice expense={expense} />
        <Receipt className="grid gap-3.5 px-5 pt-[22px] pb-[30px]">
          <article className="grid gap-3.5">
            <div className="flex items-center gap-3">
              <CategoryDot color={category.color}>{category.emoji}</CategoryDot>
              <div className="min-w-0 grow">
                <h2 className="text-[19px] leading-tight font-bold [overflow-wrap:anywhere]">{snapshot.description}</h2>
                <p className="text-sm text-ink-2">
                  {categoryName(category, lang)}, {dayLabel(snapshot.date, lang)}
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              {refund ? <span className="rounded-full bg-[color-mix(in_srgb,var(--pool)_22%,var(--receipt))] px-2 text-[12.5px] font-bold">{t.expenses.refund}</span> : null}
              <span className="display num grow text-right text-[calc(40px*var(--d-scale))]" data-testid="detail-amount">
                {money(snapshot.amount)}
              </span>
            </div>
            <hr className="tear" />
            <b className="text-sm">{refund ? t.expenses.receivers : t.expenses.payers}</b>
            {snapshot.payers.map((p) => (
              <DetailRow key={p.participantId} label={nameOf(p.participantId)} value={money(p.amount)} />
            ))}
            <hr className="tear" />
            <b className="text-sm">
              {t.expenses.splitL}: {methodLabel[split.method]}
            </b>
            {trip.participants
              .filter((p) => shares[p.id] !== undefined)
              .map((p) => (
                <DetailRow
                  key={p.id}
                  label={
                    <>
                      {p.name} <span className="text-sm text-ink-2">{inputOf(p.id)}</span>
                    </>
                  }
                  value={
                    <>
                      {money(shares[p.id] ?? 0)}
                      {leftover.includes(p.id) ? (
                        <span className="ml-1.5 inline-block rounded-full bg-[color-mix(in_srgb,var(--pos)_18%,var(--receipt))] px-1.5 text-xs font-bold text-ink">
                          {`${refund ? "-" : "+"}${money(1)}`}
                        </span>
                      ) : null}
                    </>
                  }
                />
              ))}
            <hr className="tear" />
            <p className="text-sm" data-testid="detail-leftover">
              {t.expenses.leftoverNote(leftover.length, listNames(leftover.map(nameOf), lang))}
            </p>
            <p className="text-[13.5px] text-ink-2">{t.expenses.leftoverRule}</p>
          </article>
        </Receipt>
        {readOnly ? null : confirming ? (
          <Notice>
            <p>{t.expenses.delQ}</p>
            <div className="flex items-center gap-2.5">
              <Button size="sm" variant="danger" onClick={() => void remove()}>
                {t.expenses.delYes}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                {t.shell.cancel}
              </Button>
            </div>
          </Notice>
        ) : (
          <div className="flex items-center gap-2.5">
            <Button className="grow" onClick={onEdit}>
              <PencilSimple size={20} weight="fill" aria-hidden="true" />
              {t.expenses.edit}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              <Trash size={20} weight="fill" aria-hidden="true" />
              {t.expenses.del}
            </Button>
          </div>
        )}
      </div>
    </Overlay>
  );
};

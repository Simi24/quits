import { Check, HandCoins, ShareNetwork } from "@phosphor-icons/react";
import { Button, Ticket } from "../../components";
import { useDevice } from "../../device";
import { hasPaymentDetails, paymentDetailsOf } from "../../../domain";
import type { SuggestedSettlement } from "../../../domain";
import { useTrip } from "../../trip";

interface SuggestedListProps {
  suggestions: SuggestedSettlement[];
  onRecord: (suggestion: SuggestedSettlement) => void;
  onRecordAll: () => void;
  onRecordOther: () => void;
  onShare: () => void;
  onPay: (suggestion: SuggestedSettlement) => void;
  onAddPaymentDetails: () => void;
}

/** "Pagamenti suggeriti": one ticket per suggestion, "Registra tutti", or the all-even notice (SPEC.md §7.6 item 8). */
export const SuggestedList = ({ suggestions, onRecord, onRecordAll, onRecordOther, onShare, onPay, onAddPaymentDetails }: SuggestedListProps) => {
  const { t } = useDevice();
  const { trip, meId, money, nameOf, readOnly } = useTrip();
  return (
    <>
      <h2 className="display mt-3.5 text-[calc(20px*var(--d-scale))]">{t.balances.suggested}</h2>
      <p className="text-[13.5px] text-ink-2">{t.balances.suggestedHelp}</p>
      {suggestions.length ? (
        <>
          <ul className="grid gap-2">
            {suggestions.map((s) => {
              const canPay = !readOnly && hasPaymentDetails(paymentDetailsOf(trip, s.toParticipantId));
              // Gentle: only to the creditor themself, only when nothing is filled in yet.
              const hint = !readOnly && s.toParticipantId === meId && !hasPaymentDetails(paymentDetailsOf(trip, meId));
              return (
                <li key={`${s.fromParticipantId}-${s.toParticipantId}`}>
                  <Ticket>
                    <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-5 py-3.5" data-testid="suggestion">
                      <span aria-hidden="true" className="grid size-11 place-items-center rounded-full border-2 border-dashed border-ink-2">
                        <HandCoins size={22} weight="fill" />
                      </span>
                      <span className="min-w-0">
                        <span className="block leading-tight font-bold">{t.balances.gives(nameOf(s.fromParticipantId), nameOf(s.toParticipantId))}</span>
                        <b className="display num text-[calc(22px*var(--d-scale))]">{money(s.amount)}</b>
                      </span>
                      {readOnly ? (
                        <span />
                      ) : canPay ? (
                        <span />
                      ) : (
                        <Button size="sm" variant="ghost" className="[--ring:var(--ink-2)]" onClick={() => onRecord(s)}>
                          {t.balances.record}
                        </Button>
                      )}
                      {canPay ? (
                        <div className="col-span-2 col-start-2 flex flex-wrap gap-2">
                          <Button size="sm" aria-label={t.payment.payFor(nameOf(s.toParticipantId))} onClick={() => onPay(s)}>
                            {t.payment.pay}
                          </Button>
                          <Button size="sm" variant="ghost" className="[--ring:var(--ink-2)]" onClick={() => onRecord(s)}>
                            {t.balances.record}
                          </Button>
                        </div>
                      ) : null}
                      {hint ? (
                        <div className="col-span-2 col-start-2 grid justify-items-start gap-1 text-[13.5px] text-ink-2" data-testid="payment-hint">
                          <p>{t.payment.hint}</p>
                          <Button size="sm" variant="ghost" onClick={onAddPaymentDetails}>
                            {t.payment.hintAction}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </Ticket>
                </li>
              );
            })}
          </ul>
          {readOnly ? null : (
            <Button wide onClick={onRecordAll}>
              {t.balances.recordAll}
            </Button>
          )}
        </>
      ) : (
        <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-[14px] bg-notice shadow-[inset_4px_0_0_var(--notice-rule)] p-3.5 text-[14.5px]">
          <Check size={20} weight="bold" className="mt-0.5" aria-hidden="true" />
          <div>
            <b>{t.balances.allEven}</b>
            <p>{t.balances.allEvenHelp}</p>
          </div>
        </div>
      )}
      {readOnly ? null : (
        <Button wide variant="ghost" onClick={onRecordOther}>
          <HandCoins size={20} weight="fill" aria-hidden="true" />
          {t.balances.recordOther}
        </Button>
      )}
      <Button wide variant="ghost" onClick={onShare}>
        <ShareNetwork size={20} weight="bold" aria-hidden="true" />
        {t.balances.share}
      </Button>
    </>
  );
};

import { Button, Sheet, useSingleFlight } from "../../components";
import { useDevice } from "../../device";
import { paymentActions, paymentDetailsOf } from "../../../domain";
import type { SuggestedSettlement } from "../../../domain";
import { todayIso } from "../../format";
import { useTrip } from "../../trip";
import { PayAction } from "./PayAction";

interface PaySheetProps {
  suggestion: SuggestedSettlement;
  onClose: () => void;
  onRecorded: () => void;
}

/** Pay a suggested settlement: the creditor's ways to receive money, then "Segna come pagato" (SPEC.md §3.16, §7.6). Money never passes through Quits. */
export const PaySheet = ({ suggestion, onClose, onRecorded }: PaySheetProps) => {
  const { t } = useDevice();
  const { trip, record, money, nameOf } = useTrip();
  const creditor = nameOf(suggestion.toParticipantId);
  const details = paymentDetailsOf(trip, suggestion.toParticipantId) ?? {};
  const actions = paymentActions(details, { amount: suggestion.amount, currency: trip.currency });

  const marking = useSingleFlight(async () => {
    await record({
      type: "SettlementRecorded",
      settlementId: crypto.randomUUID(),
      fromParticipantId: suggestion.fromParticipantId,
      toParticipantId: suggestion.toParticipantId,
      amount: suggestion.amount,
      date: todayIso(),
    });
    onRecorded();
  });

  return (
    <Sheet
      title={t.payment.payTitle(creditor)}
      onClose={onClose}
      footer={
        <Button wide disabled={marking.busy} onClick={() => void marking.run()}>
          {t.payment.markPaid}
        </Button>
      }
    >
      <div className="grid gap-4 px-4 pt-1.5 pb-6">
        <p className="display num text-[calc(26px*var(--d-scale))]">{t.payment.payLead(money(suggestion.amount), creditor)}</p>
        <div className="grid gap-3.5">
          {actions.map((action) => (
            <PayAction key={action.method} action={action} />
          ))}
        </div>
        <p className="text-[13.5px] text-ink-2">{t.payment.payHelp}</p>
      </div>
    </Sheet>
  );
};

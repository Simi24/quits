import { Avatar, Button } from "../../components";
import { useDevice } from "../../device";
import { hasPaymentDetails, paymentDetailsOf } from "../../../domain";
import { avatarIndex, useTrip } from "../../trip";

interface PaymentDetailsRowProps {
  participant: { id: string; name: string };
  onEdit: (id: string) => void;
}

/** One participant and which ways to receive money they filled in (never the values themselves). */
export const PaymentDetailsRow = ({ participant, onEdit }: PaymentDetailsRowProps) => {
  const { t } = useDevice();
  const { trip } = useTrip();
  const details = paymentDetailsOf(trip, participant.id);
  const names = [details?.iban && t.payment.iban, details?.paypal && "PayPal", details?.revolut && "Revolut", details?.satispayPhone && "Satispay"].filter(Boolean);
  return (
    <li className="flex min-h-[52px] items-center gap-2.5 py-1.5" data-testid="payment-row">
      <Avatar name={participant.name} index={avatarIndex(trip, participant.id)} />
      <div className="min-w-0 grow">
        <b className="block truncate">{participant.name}</b>
        <span className="block text-sm text-ink-2">{hasPaymentDetails(details) ? names.join(", ") : t.payment.none}</span>
      </div>
      <Button size="sm" variant="ghost" aria-label={hasPaymentDetails(details) ? t.payment.editFor(participant.name) : t.payment.addFor(participant.name)} onClick={() => onEdit(participant.id)}>
        {hasPaymentDetails(details) ? t.payment.edit : t.payment.add}
      </Button>
    </li>
  );
};

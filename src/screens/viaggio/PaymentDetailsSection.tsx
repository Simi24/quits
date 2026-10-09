import { useState } from "react";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { PaymentDetailsRow } from "./PaymentDetailsRow";
import { PaymentDetailsSheet } from "./PaymentDetailsSheet";
import { Setting } from "./Setting";

interface PaymentDetailsSectionProps {
  notify: (text: string) => void;
}

/** "Come ricevere i soldi": every participant's optional IBAN, PayPal.me, Revolut and Satispay number (SPEC.md §3.16). */
export const PaymentDetailsSection = ({ notify }: PaymentDetailsSectionProps) => {
  const { t } = useDevice();
  const { trip, meId } = useTrip();
  const [editing, setEditing] = useState<string | null>(null);
  // This device's own participant first: it is the one most likely to be filled in.
  const ordered = [...trip.participants].sort((a, b) => Number(b.id === meId) - Number(a.id === meId));
  return (
    <Setting title={t.payment.title} edits id="payment-details">
      <p className="text-[13.5px] text-ink-2">{t.payment.help}</p>
      <ul className="[&>li+li]:border-t-[1.5px] [&>li+li]:border-dashed [&>li+li]:border-line">
        {ordered.map((p) => (
          <PaymentDetailsRow key={p.id} participant={p} onEdit={setEditing} />
        ))}
      </ul>
      {editing ? (
        <PaymentDetailsSheet
          participantId={editing}
          onClose={() => setEditing(null)}
          onSaved={(cleared) => {
            setEditing(null);
            notify(cleared ? t.payment.cleared : t.payment.saved);
          }}
        />
      ) : null}
    </Setting>
  );
};

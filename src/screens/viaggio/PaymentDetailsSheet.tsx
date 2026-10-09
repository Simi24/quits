import { useState } from "react";
import { Button, ErrorLine, Sheet, TextField, useSingleFlight } from "../../components";
import { useDevice } from "../../device";
import { checkPaymentDetails, formatIban, paymentDetailsOf } from "../../../domain";
import type { PaymentField } from "../../../domain";
import { useTrip } from "../../trip";

interface PaymentDetailsSheetProps {
  participantId: string;
  onClose: () => void;
  onSaved: (cleared: boolean) => void;
}

type Typed = { [F in PaymentField]: string };

/** The four optional ways to receive money of one participant, saved as one operation (SPEC.md §3.16, §7.6). */
export const PaymentDetailsSheet = ({ participantId, onClose, onSaved }: PaymentDetailsSheetProps) => {
  const { t } = useDevice();
  const { trip, record, nameOf } = useTrip();
  const current = paymentDetailsOf(trip, participantId);
  const inherited = current !== undefined && trip.paymentDetails[participantId] === undefined;
  const [typed, setTyped] = useState<Typed>({
    iban: current?.iban ? formatIban(current.iban) : "",
    paypal: current?.paypal ?? "",
    revolut: current?.revolut ?? "",
    satispayPhone: current?.satispayPhone ?? "",
  });
  const [shown, setShown] = useState(false);
  const { details, errors } = checkPaymentDetails(typed);

  const write = useSingleFlight(async (payload: Parameters<typeof record>[0]) => {
    await record(payload);
  });
  const save = async () => {
    setShown(true);
    if (Object.keys(errors).length > 0) return;
    await write.run({ type: "ParticipantPaymentDetailsSet", participantId, details });
    onSaved(Object.keys(details).length === 0);
  };
  const clear = async () => {
    await write.run({ type: "ParticipantPaymentDetailsSet", participantId, details: {} });
    onSaved(true);
  };

  const field = (name: PaymentField, label: string, hint: string, error: string, extra: { placeholder?: string; inputMode?: "tel" | "text"; autoComplete?: string } = {}) => {
    const wrong = shown && errors[name] !== undefined;
    return (
      <div className="grid gap-1.5">
        <TextField
          id={`pay-${name}`}
          label={label}
          hint={hint}
          value={typed[name]}
          onChange={(e) => setTyped({ ...typed, [name]: e.target.value })}
          aria-invalid={wrong}
          aria-describedby={wrong ? `pay-${name}-error` : undefined}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          {...extra}
        />
        <div id={`pay-${name}-error`} aria-live="polite">
          {wrong ? <ErrorLine>{error}</ErrorLine> : null}
        </div>
      </div>
    );
  };

  return (
    <Sheet
      title={t.payment.sheetTitle(nameOf(participantId))}
      onClose={onClose}
      footer={
        <>
          <Button wide disabled={write.busy} onClick={() => void save()}>
            {t.payment.save}
          </Button>
          {current ? (
            <Button wide variant="ghost" disabled={write.busy} onClick={() => void clear()}>
              {t.payment.clear}
            </Button>
          ) : null}
        </>
      }
    >
      <form
        className="grid grid-cols-1 gap-[14px] px-4 pt-1.5 pb-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {inherited ? <p className="text-[13.5px] text-ink-2">{t.payment.inherited}</p> : null}
        {field("iban", t.payment.iban, t.payment.ibanHint, t.payment.ibanInvalid)}
        {field("paypal", t.payment.paypal, t.payment.paypalHint, t.payment.paypalInvalid)}
        {field("revolut", t.payment.revolut, t.payment.revolutHint, t.payment.revolutInvalid)}
        {field("satispayPhone", t.payment.satispay, t.payment.satispayHint, t.payment.satispayInvalid, { placeholder: t.payment.satispayPlaceholder, inputMode: "tel" })}
        {current ? <p className="text-[13.5px] text-ink-2">{t.payment.clearedNote}</p> : null}
      </form>
    </Sheet>
  );
};

import { useState } from "react";
import { AmountField, Button, ErrorLine, Notice, SelectField, Sheet, TextField, useSingleFlight } from "../../components";
import { useDevice } from "../../device";
import { expenseSnapshotSchema, findDuplicateSettlement } from "../../../domain";
import type { SuggestedSettlement } from "../../../domain";
import { amountToInput, parseAmount, todayIso } from "../../format";
import { useTrip } from "../../trip";

interface SettlementSheetProps {
  /** A suggestion to prefill, or null for "Registra un altro pagamento". */
  prefill: SuggestedSettlement | null;
  onClose: () => void;
  onSaved: (settlementId: string) => void;
}

/** Record a settlement: who gave, to whom, how much, when (SPEC.md §3.9, §7.6 item 9). */
export const SettlementSheet = ({ prefill, onClose, onSaved }: SettlementSheetProps) => {
  const { t, lang } = useDevice();
  const { trip, meId, record } = useTrip();
  const people = trip.participants;
  const other = people.find((p) => p.id !== meId)?.id ?? meId;
  const [from, setFrom] = useState(prefill?.fromParticipantId ?? meId);
  const [to, setTo] = useState(prefill?.toParticipantId ?? other);
  const [amount, setAmount] = useState(prefill ? amountToInput(prefill.amount, trip.currency, lang) : "");
  const [date, setDate] = useState(todayIso());

  const minor = parseAmount(amount, trip.currency) ?? 0;
  const samePerson = from === to;
  const undated = !expenseSnapshotSchema.shape.date.safeParse(date).success;
  const ready = !samePerson && !undated && minor > 0;
  const duplicate = !samePerson && minor > 0 && findDuplicateSettlement(trip, { fromParticipantId: from, toParticipantId: to, amount: minor, date });

  const saving = useSingleFlight(async () => {
    if (!ready) return;
    const settlementId = crypto.randomUUID();
    await record({ type: "SettlementRecorded", settlementId, fromParticipantId: from, toParticipantId: to, amount: minor, date });
    onSaved(settlementId);
  });

  const options = people.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ));

  return (
    <Sheet
      title={t.balances.newSettlement}
      onClose={onClose}
      footer={
        <Button wide disabled={!ready || saving.busy} onClick={() => void saving.run()}>
          {t.balances.record}
        </Button>
      }
    >
      <form
        className="grid grid-cols-1 gap-[18px] px-4 pt-1.5 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          void saving.run();
        }}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <SelectField id="settlement-from" label={t.balances.fromL} value={from} onChange={(e) => setFrom(e.target.value)}>
            {options}
          </SelectField>
          <SelectField id="settlement-to" label={t.balances.toL} value={to} onChange={(e) => setTo(e.target.value)}>
            {options}
          </SelectField>
        </div>
        <div className="grid gap-1.5">
          <AmountField id="settlement-amount" label={t.expenses.amount} value={amount} currency={trip.currency} onChange={setAmount} />
          <small className="text-[13.5px] text-ink-2">{t.balances.settleHelp}</small>
        </div>
        <TextField id="settlement-date" type="date" label={t.expenses.date} value={date} onChange={(e) => setDate(e.target.value)} />
        <div aria-live="polite">
          {samePerson ? (
            <ErrorLine>{t.balances.samePerson}</ErrorLine>
          ) : undated ? (
            <ErrorLine>{t.expenses.vDate}</ErrorLine>
          ) : duplicate ? (
            <Notice>
              <p>{t.balances.dupWarn}</p>
            </Notice>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
};

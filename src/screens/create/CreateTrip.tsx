import { CaretLeft } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, ErrorLine, IconButton, SelectField, TextField, useSingleFlight } from "../../components";
import { NAME_MAX_LENGTH } from "../../../domain";
import { buildTripCreation, newTripIssues } from "../../create-trip/new-trip";
import type { NewTripForm } from "../../create-trip/new-trip";
import { createTrip } from "../../db";
import { useDevice } from "../../device";
import { DefaultSplitField } from "./DefaultSplitField";
import { PeopleField } from "./PeopleField";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY"];

interface CreateTripProps {
  onBack: () => void;
  onCreated: (tripId: string) => void;
}

/** Creates a trip on this device (S2). Server-side creation with a creator code arrives in S4. */
export const CreateTrip = ({ onBack, onCreated }: CreateTripProps) => {
  const { t, deviceId } = useDevice();
  const [form, setForm] = useState<NewTripForm>({
    name: "",
    currency: "EUR",
    from: "",
    to: "",
    people: [],
    defaultMethod: "equal",
    shares: [],
  });
  const [tried, setTried] = useState(false);
  const issues = newTripIssues(form);

  const submit = useSingleFlight(async () => {
    setTried(true);
    if (issues.length) return;
    const { tripId, operation } = buildTripCreation(form, deviceId);
    await createTrip(tripId, operation);
    onCreated(tripId);
  });

  const messages: Record<(typeof issues)[number], string> = {
    name_missing: t.create.needName,
    people_missing: t.create.needPeople,
    dates_reversed: t.create.datesOrder,
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-1 py-2.5 pr-2 pl-1">
        <IconButton label={t.shell.back} onClick={onBack}>
          <CaretLeft size={22} weight="bold" />
        </IconButton>
        <h1 className="display text-[calc(23px*var(--d-scale))]">{t.create.newTrip}</h1>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <main className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-4 pt-5 pb-7">
          <TextField
            id="trip-name"
            label={t.create.tripName}
            placeholder={t.create.tripNamePh}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="off"
          />
          <SelectField id="trip-currency" label={t.create.currency} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {CURRENCIES.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </SelectField>
          <fieldset className="grid gap-2.5">
            <legend className="mb-2.5 text-sm font-semibold">
              {t.create.dates} <span className="font-normal text-ink-2">({t.create.optional})</span>
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              <TextField id="trip-from" type="date" label={t.create.from} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
              <TextField id="trip-to" type="date" label={t.create.to} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
            </div>
          </fieldset>
          <PeopleField
            people={form.people}
            onAdd={(name) => setForm({ ...form, people: [...form.people, name], shares: [...form.shares, 1] })}
            onRemove={(i) => setForm({ ...form, people: form.people.filter((_, j) => j !== i), shares: form.shares.filter((_, j) => j !== i) })}
          />
          <DefaultSplitField
            people={form.people}
            method={form.defaultMethod}
            shares={form.shares}
            onMethod={(defaultMethod) => setForm({ ...form, defaultMethod })}
            onShares={(i, v) => setForm({ ...form, shares: form.shares.map((s, j) => (j === i ? v : s)) })}
          />
          {tried ? issues.map((issue) => <ErrorLine key={issue}>{messages[issue]}</ErrorLine>) : null}
        </main>
        <div className="border-t-[1.5px] border-line px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
          <Button wide disabled={submit.busy} onClick={() => void submit.run()}>
            {t.create.createIt}
          </Button>
        </div>
      </div>
    </div>
  );
};

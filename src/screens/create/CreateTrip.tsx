import { CaretLeft } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, DateRangeField, ErrorLine, IconButton, SelectField, TextField, useSingleFlight } from "../../components";
import { NAME_MAX_LENGTH } from "../../../domain";
import { CURRENCIES } from "../../create-trip/currencies";
import { buildTripCreation, newTripIssues } from "../../create-trip/new-trip";
import type { NewTripForm } from "../../create-trip/new-trip";
import { useDevice } from "../../device";
import { createTripOnServer } from "../../sync";
import { api, store } from "../../sync/client";
import { DefaultSplitField } from "./DefaultSplitField";
import { PeopleField } from "./PeopleField";

interface CreateTripProps {
  onBack: () => void;
  onCreated: (tripId: string, token: string) => void;
}

/** Creates a trip on the server with the device's creator code. Online only (SPEC.md §6.2). */
export const CreateTrip = ({ onBack, onCreated }: CreateTripProps) => {
  const { t, deviceId, creatorCode, setCreatorCode } = useDevice();
  const [form, setForm] = useState<NewTripForm>({
    name: "",
    currency: "EUR",
    from: "",
    to: "",
    people: [],
    defaultMethod: "equal",
    shares: [],
  });
  const [failure, setFailure] = useState<"offline" | "refused" | "failed" | null>(null);
  const issues = newTripIssues(form);

  const submit = useSingleFlight(async () => {
    if (issues.length) return;
    if (!creatorCode) return setFailure("refused");
    setFailure(null);
    const { operation } = buildTripCreation(form, deviceId);
    const result = await createTripOnServer({ api, store }, creatorCode, operation);
    if (result.status === "ok") return onCreated(result.tripId, result.token);
    // A refused code was revoked: forgetting it brings the code field back on the landing (SPEC.md §4).
    if (result.status === "forbidden") setCreatorCode(null);
    setFailure(result.status === "offline" ? "offline" : result.status === "forbidden" ? "refused" : "failed");
  });

  const messages: Record<(typeof issues)[number], string> = {
    name_missing: t.create.needName,
    you_missing: t.create.needYou,
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
        <main className="grid min-h-0 flex-1 content-start gap-5 overflow-x-clip overflow-y-auto px-4 pt-5 pb-7">
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
          <DateRangeField idPrefix="trip" from={form.from} to={form.to} onFrom={(from) => setForm({ ...form, from })} onTo={(to) => setForm({ ...form, to })} />
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
          {failure ? <ErrorLine>{{ offline: t.sync.createOffline, refused: t.sync.createCodeRefused, failed: t.sync.createFailed }[failure]}</ErrorLine> : null}
        </main>
        <div className="border-t-[1.5px] border-line px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
          <Button wide disabled={submit.busy || issues.length > 0} aria-describedby={issues.length ? "create-missing" : undefined} onClick={() => void submit.run()}>
            {submit.busy ? t.sync.creating : t.create.createIt}
          </Button>
          {issues.length ? (
            <div role="status" id="create-missing" data-testid="create-missing" className="mt-2.5 grid gap-0.5 text-center text-[13.5px] text-ink-2">
              {issues.map((issue) => (
                <p key={issue}>{messages[issue]}</p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

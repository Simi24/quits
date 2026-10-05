import { useState } from "react";
import { Button, ErrorLine, TextField, useSingleFlight } from "../../components";
import { NAME_MAX_LENGTH } from "../../../domain";
import type { OperationPayload } from "../../trip";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { Setting } from "./Setting";

interface TripDetailsSectionProps {
  onSaved: () => void;
}

/** The trip's name and dates, editable at any time (SPEC.md §3.2): `TripRenamed` and `TripDatesChanged`. */
export const TripDetailsSection = ({ onSaved }: TripDetailsSectionProps) => {
  const { t } = useDevice();
  const { trip, recordMany } = useTrip();
  const [name, setName] = useState(trip.name);
  const [from, setFrom] = useState(trip.from ?? "");
  const [to, setTo] = useState(trip.to ?? "");

  const nameChanged = name.trim() !== trip.name;
  const datesChanged = from !== (trip.from ?? "") || to !== (trip.to ?? "");
  const backwards = from !== "" && to !== "" && to < from;
  const canSave = name.trim() !== "" && !backwards && (nameChanged || datesChanged);

  const save = useSingleFlight(async () => {
    if (!canSave) return;
    const changes: OperationPayload[] = [];
    if (nameChanged) changes.push({ type: "TripRenamed", name: name.trim() });
    if (datesChanged) changes.push({ type: "TripDatesChanged", from: from || null, to: to || null });
    await recordMany(changes);
    onSaved();
  });

  return (
    <Setting title={t.manage.tripSection} edits>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save.run();
        }}
      >
        <TextField id="edit-trip-name" label={t.manage.tripName} value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX_LENGTH} autoComplete="off" />
        <fieldset className="grid gap-2.5">
          <legend className="mb-2.5 text-sm font-semibold">{t.create.dates}</legend>
          <div className="grid grid-cols-2 gap-2.5">
            <TextField id="edit-trip-from" type="date" label={t.create.from} value={from} onChange={(e) => setFrom(e.target.value)} />
            <TextField id="edit-trip-to" type="date" label={t.create.to} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <p className="text-[13.5px] text-ink-2">{t.manage.datesHelp}</p>
        </fieldset>
        {backwards ? <ErrorLine>{t.create.datesOrder}</ErrorLine> : null}
        <div>
          <Button type="submit" disabled={!canSave || save.busy}>
            {t.manage.saveTrip}
          </Button>
        </div>
      </form>
    </Setting>
  );
};

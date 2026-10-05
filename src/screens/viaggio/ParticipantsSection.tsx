import { UserPlus } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, ErrorLine, TextField } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { ParticipantRow } from "./ParticipantRow";
import { Setting } from "./Setting";

export const ParticipantsSection = ({ onAdded }: { onAdded: () => void }) => {
  const { t } = useDevice();
  const { trip, record } = useTrip();
  const [name, setName] = useState("");
  const duplicate = name.trim() !== "" && trip.participants.some((p) => p.name.toLowerCase() === name.trim().toLowerCase());

  const add = async () => {
    if (!name.trim() || duplicate) return;
    await record({ type: "ParticipantAdded", participantId: crypto.randomUUID(), name: name.trim() });
    setName("");
    onAdded();
  };

  return (
    <Setting title={t.settings.participants}>
      <ul className="[&>li+li]:border-t-[1.5px] [&>li+li]:border-dashed [&>li+li]:border-line">
        {trip.participants.map((p) => (
          <ParticipantRow key={p.id} participant={p} />
        ))}
      </ul>
      <p className="text-[13.5px] text-ink-2">{t.settings.participantsHelp}</p>
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <div className="grow">
          <TextField id="add-participant" label={t.create.addName} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>
        <Button type="submit" variant="ghost" disabled={!name.trim() || duplicate}>
          <UserPlus size={20} weight="fill" aria-hidden="true" />
          {t.create.add}
        </Button>
      </form>
      {duplicate ? <ErrorLine>{t.create.dupName}</ErrorLine> : null}
    </Setting>
  );
};

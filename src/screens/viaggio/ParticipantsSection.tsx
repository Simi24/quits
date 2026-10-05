import { AddNameForm } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { ParticipantRow } from "./ParticipantRow";
import { Setting } from "./Setting";

interface ParticipantsSectionProps {
  onAdded: () => void;
}

/** The trip's participants: rename each, add new ones (SPEC.md §3.3). Remove and merge arrive with S6. */
export const ParticipantsSection = ({ onAdded }: ParticipantsSectionProps) => {
  const { t } = useDevice();
  const { trip, record } = useTrip();

  const add = async (name: string) => {
    await record({ type: "ParticipantAdded", participantId: crypto.randomUUID(), name });
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
      <AddNameForm id="add-participant" label={t.create.addName} taken={trip.participants.map((p) => p.name)} onAdd={add} />
    </Setting>
  );
};

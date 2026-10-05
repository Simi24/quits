import { useState } from "react";
import { AddNameForm } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { MergeSheet } from "./MergeSheet";
import { ParticipantRow } from "./ParticipantRow";
import { Setting } from "./Setting";

interface ParticipantsSectionProps {
  notify: (text: string) => void;
}

/** The trip's participants: rename, remove when unused, merge, add (SPEC.md §3.3). */
export const ParticipantsSection = ({ notify }: ParticipantsSectionProps) => {
  const { t } = useDevice();
  const { trip, record } = useTrip();
  const [merging, setMerging] = useState<string | null>(null);

  const add = async (name: string) => {
    await record({ type: "ParticipantAdded", participantId: crypto.randomUUID(), name });
    notify(t.settings.personAdded);
  };

  return (
    <Setting title={t.settings.participants}>
      <ul className="[&>li+li]:border-t-[1.5px] [&>li+li]:border-dashed [&>li+li]:border-line">
        {trip.participants.map((p) => (
          <ParticipantRow key={p.id} participant={p} onRemoved={(name) => notify(t.manage.removed(name))} onMerge={setMerging} />
        ))}
      </ul>
      <p className="text-[13.5px] text-ink-2">{t.manage.removeRule}</p>
      <AddNameForm id="add-participant" label={t.create.addName} taken={trip.participants.map((p) => p.name)} onAdd={add} />
      {merging ? (
        <MergeSheet
          fromId={merging}
          onClose={() => setMerging(null)}
          onMerged={(x, y) => {
            setMerging(null);
            notify(t.manage.merged(x, y));
          }}
        />
      ) : null}
    </Setting>
  );
};

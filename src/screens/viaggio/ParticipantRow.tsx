import { ArrowsMerge, PencilSimple, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { Avatar, Button, IconButton, TextField } from "../../components";
import { useDevice } from "../../device";
import { avatarIndex, useTrip } from "../../trip";
import { canRemoveParticipant, NAME_MAX_LENGTH } from "../../../domain";

interface ParticipantRowProps {
  participant: { id: string; name: string };
  onRemoved: (name: string) => void;
  onMerge: (id: string) => void;
}

/** A participant: name, shares when the default split counts them, rename, remove when unused, merge (SPEC.md §3.3). */
export const ParticipantRow = ({ participant, onRemoved, onMerge }: ParticipantRowProps) => {
  const { t } = useDevice();
  const { trip, meId, record } = useTrip();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(participant.name);
  const shares = trip.defaultSplit.method === "shares" ? (trip.defaultSplit.shares[participant.id] ?? 1) : null;
  const clash = trip.participants.some((p) => p.id !== participant.id && p.name.toLowerCase() === name.trim().toLowerCase());
  // Whoever this device is stays in the trip: removing them would leave the device with nobody to be.
  const removable = participant.id !== meId && canRemoveParticipant(trip, participant.id);

  const save = async () => {
    if (!name.trim() || clash) return;
    if (name.trim() !== participant.name) await record({ type: "ParticipantRenamed", participantId: participant.id, name: name.trim() });
    setEditing(false);
  };
  const remove = async () => {
    await record({ type: "ParticipantRemoved", participantId: participant.id });
    onRemoved(participant.name);
  };

  if (editing) {
    return (
      <li className="flex min-h-[52px] items-end gap-2.5 py-1.5">
        <div className="grow">
          <TextField id={`rename-${participant.id}`} label={`${t.settings.rename} ${participant.name}`} hideLabel value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX_LENGTH} autoComplete="off" />
        </div>
        <Button disabled={!name.trim() || clash} onClick={() => void save()}>
          {t.settings.renameSave}
        </Button>
      </li>
    );
  }
  return (
    <li className="flex min-h-[52px] items-center gap-1.5">
      <Avatar name={participant.name} index={avatarIndex(trip, participant.id)} />
      <div className="ml-1 min-w-0 grow">
        <b>{participant.name}</b>
        {shares !== null ? <span className="ml-2 text-sm text-ink-2">{t.create.shares(shares)}</span> : null}
      </div>
      <IconButton label={`${t.settings.rename} ${participant.name}`} onClick={() => setEditing(true)}>
        <PencilSimple size={20} weight="fill" aria-hidden="true" />
      </IconButton>
      <IconButton label={`${t.manage.mergeAction} ${participant.name}`} onClick={() => onMerge(participant.id)}>
        <ArrowsMerge size={20} weight="fill" aria-hidden="true" />
      </IconButton>
      {removable ? (
        <IconButton label={`${t.manage.remove} ${participant.name}`} onClick={() => void remove()}>
          <Trash size={20} weight="fill" aria-hidden="true" />
        </IconButton>
      ) : null}
    </li>
  );
};

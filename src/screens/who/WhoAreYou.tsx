import { UserPlus } from "@phosphor-icons/react";
import { useState } from "react";
import { Avatar, Button, EqualMark, TextField, useSingleFlight } from "../../components";
import { NAME_MAX_LENGTH } from "../../../domain";
import { useDevice } from "../../device";
import { avatarIndex, useTrip } from "../../trip";

interface WhoAreYouProps {
  onDone: () => void;
}

/** "Chi sei?": pick your name from the list, or add yours (SPEC.md §7.6 item 3). Remembered per trip. */
export const WhoAreYou = ({ onDone }: WhoAreYouProps) => {
  const { t } = useDevice();
  const { trip, record, chooseMe } = useTrip();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const taken = trip.roster.some((r) => r.name.toLowerCase() === name.trim().toLowerCase());

  const pick = async (id: string) => {
    await chooseMe(id);
    onDone();
  };

  const addMe = useSingleFlight(async () => {
    if (!name.trim() || taken) return;
    const participantId = crypto.randomUUID();
    await record({ type: "ParticipantAdded", participantId, name: name.trim() }, participantId);
    await pick(participantId);
  });

  return (
    <main className="grid h-full content-start gap-5 overflow-y-auto px-4 pt-9 pb-8">
      <div className="flex items-center gap-3">
        <EqualMark width={34} barHeight={7} />
        <span className="display text-[calc(30px*var(--d-scale))]">quits</span>
      </div>
      <div>
        <p className="text-ink-2">{trip.name}</p>
        <h1 className="display text-[calc(44px*var(--d-scale))]">{t.create.whoAreYou}</h1>
      </div>
      <p className="text-ink-2">{t.create.whoHelp}</p>
      <ul className="grid gap-2.5">
        {trip.participants.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => void pick(p.id)}
              className="flex min-h-14 w-full items-center gap-3.5 rounded-full border-[1.5px] border-line bg-receipt px-[18px] py-3.5 text-lg font-bold hover:border-ink-2"
            >
              <Avatar name={p.name} index={avatarIndex(trip, p.id)} />
              {p.name}
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void addMe.run();
          }}
        >
          <div className="grow">
            <TextField id="me-name" label={t.create.yourName} value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX_LENGTH} autoComplete="off" />
          </div>
          <Button type="submit" disabled={!name.trim() || taken || addMe.busy}>
            {t.create.addMe}
          </Button>
        </form>
      ) : (
        <Button variant="ghost" onClick={() => setAdding(true)}>
          <UserPlus size={20} weight="fill" aria-hidden="true" />
          {t.create.notInList}
        </Button>
      )}
    </main>
  );
};

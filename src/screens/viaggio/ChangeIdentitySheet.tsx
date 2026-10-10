import { useState } from "react";
import { Button, Chip, Sheet, useSingleFlight } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";

interface ChangeIdentitySheetProps {
  onClose: () => void;
  onChanged: (name: string) => void;
}

/** Lists the other participants and says plainly that everyone will see the change; confirming writes `IdentityChanged` and switches the device (SPEC.md §3.17). */
export const ChangeIdentitySheet = ({ onClose, onChanged }: ChangeIdentitySheetProps) => {
  const { t } = useDevice();
  const { trip, meId, nameOf, record, chooseMe } = useTrip();
  const others = trip.participants.filter((p) => p.id !== meId);
  const [pickedId, setPickedId] = useState(others[0]?.id ?? "");

  const confirm = useSingleFlight(async () => {
    if (!pickedId) return;
    await record({ type: "IdentityChanged", participantId: pickedId });
    await chooseMe(pickedId);
    onChanged(nameOf(pickedId));
  });

  return (
    <Sheet
      title={t.settings.changeTitle}
      onClose={onClose}
      footer={
        <Button wide disabled={!pickedId || confirm.busy} onClick={() => void confirm.run()}>
          {t.settings.changeCta(nameOf(pickedId))}
        </Button>
      }
    >
      <div className="grid gap-4 px-4 pt-1 pb-5">
        <p>{t.settings.changeHelp}</p>
        <fieldset className="grid gap-2.5">
          <legend className="mb-2.5 text-sm font-semibold">{t.settings.changeWho}</legend>
          <div className="flex flex-wrap gap-2">
            {others.map((p) => (
              <Chip key={p.id} pressed={p.id === pickedId} onClick={() => setPickedId(p.id)}>
                {p.name}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>
    </Sheet>
  );
};

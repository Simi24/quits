import { Avatar, Button } from "../../components";
import { useDevice } from "../../device";
import { avatarIndex, useTrip } from "../../trip";
import { Setting } from "./Setting";

interface IdentitySectionProps {
  onNotMe: () => void;
}

/** "Su questo dispositivo": who this device is in the trip, and "Non sono io" (SPEC.md §7.6 item 12). */
export const IdentitySection = ({ onNotMe }: IdentitySectionProps) => {
  const { t } = useDevice();
  const { trip, meId, nameOf } = useTrip();
  return (
    <Setting title={t.settings.identity}>
      <div className="flex items-center gap-2.5">
        <Avatar name={nameOf(meId)} index={avatarIndex(trip, meId)} />
        <b className="grow">{t.shell.youAre(nameOf(meId))}</b>
        <Button size="sm" variant="ghost" onClick={onNotMe}>
          {t.settings.notMe}
        </Button>
      </div>
    </Setting>
  );
};

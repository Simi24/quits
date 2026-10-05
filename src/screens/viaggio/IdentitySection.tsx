import { Avatar, Button } from "../../components";
import { useDevice } from "../../device";
import { avatarIndex, useTrip } from "../../trip";
import { Setting } from "./Setting";

export const IdentitySection = ({ onNotMe }: { onNotMe: () => void }) => {
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

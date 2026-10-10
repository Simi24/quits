import { useState } from "react";
import { Avatar, Button } from "../../components";
import { useDevice } from "../../device";
import { avatarIndex, useTrip } from "../../trip";
import { ChangeIdentitySheet } from "./ChangeIdentitySheet";
import { Setting } from "./Setting";

interface IdentitySectionProps {
  notify: (text: string) => void;
}

/** "Su questo telefono sei X": who this device is, and the only way to change it, which the history shows (SPEC.md §3.17). */
export const IdentitySection = ({ notify }: IdentitySectionProps) => {
  const { t } = useDevice();
  const { trip, meId, nameOf } = useTrip();
  const [changing, setChanging] = useState(false);
  const me = nameOf(meId);
  return (
    <Setting title={t.settings.identityTitle(me)}>
      <div className="flex items-center gap-2.5">
        <Avatar name={me} index={avatarIndex(trip, meId)} />
        <Button size="sm" variant="ghost" onClick={() => setChanging(true)}>
          {t.settings.notMe(me)}
        </Button>
      </div>
      {changing ? (
        <ChangeIdentitySheet
          onClose={() => setChanging(false)}
          onChanged={(name) => {
            setChanging(false);
            notify(t.shell.youAre(name));
          }}
        />
      ) : null}
    </Setting>
  );
};

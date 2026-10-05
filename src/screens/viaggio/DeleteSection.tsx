import { Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, ErrorLine, Notice } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { Setting } from "./Setting";
import { useServerAction } from "./useServerAction";

/** Delete for everyone, restorable for 30 days; online only (SPEC.md §3.2). */
export const DeleteSection = () => {
  const { t } = useDevice();
  const { token, deleteTrip } = useTrip();
  const [confirming, setConfirming] = useState(false);
  const action = useServerAction();
  if (!token) return null;

  return (
    <Setting title={t.sync.deleteTrip}>
      <p className="text-[13.5px] text-ink-2">{t.sync.deleteHelp}</p>
      {confirming ? (
        <Notice>
          <p>{t.sync.deleteHelp}</p>
          <div className="flex items-center gap-2.5">
            <Button size="sm" variant="danger" disabled={action.busy} onClick={() => void action.run(deleteTrip)}>
              {t.sync.deleteYes}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t.shell.cancel}
            </Button>
          </div>
        </Notice>
      ) : (
        <div>
          <Button size="sm" variant="ghost" className="text-neg" onClick={() => setConfirming(true)}>
            <Trash size={18} weight="fill" aria-hidden="true" />
            {t.sync.deleteTrip}
          </Button>
        </div>
      )}
      <div role="status">{action.failure ? <ErrorLine>{action.failure === "offline" ? t.sync.onlineOnly : t.sync.actionFailed}</ErrorLine> : null}</div>
    </Setting>
  );
};

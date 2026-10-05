import { Lock, LockOpen } from "@phosphor-icons/react";
import { useState } from "react";
import { balances } from "../../../domain";
import { Button, Notice } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { Setting } from "./Setting";

interface CloseSectionProps {
  notify: (text: string) => void;
}

/** Close and reopen: anyone, any time. A trip can be closed with open balances, after a warning (SPEC.md §3.2). */
export const CloseSection = ({ notify }: CloseSectionProps) => {
  const { t } = useDevice();
  const { trip, record, readOnly } = useTrip();
  const [confirming, setConfirming] = useState(false);
  const owed = balances(trip);
  const uneven = trip.participants.filter((p) => (owed[p.id] ?? 0) !== 0).length;

  const close = async () => {
    setConfirming(false);
    await record({ type: "TripClosed" });
    notify(t.sync.closedToast);
  };
  const reopen = async () => {
    await record({ type: "TripReopened" });
    notify(t.sync.reopenedToast);
  };

  return (
    <Setting title={readOnly ? t.sync.reopen : t.sync.closeTrip}>
      <p className="text-[13.5px] text-ink-2">{t.sync.closeHelp}</p>
      {readOnly ? (
        <div>
          <Button size="sm" onClick={() => void reopen()}>
            <LockOpen size={18} weight="fill" aria-hidden="true" />
            {t.sync.reopen}
          </Button>
        </div>
      ) : confirming ? (
        <Notice>
          <p>{t.sync.closeWarn(uneven)}</p>
          <div className="flex items-center gap-2.5">
            <Button size="sm" onClick={() => void close()}>
              {t.sync.closeYes}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t.shell.cancel}
            </Button>
          </div>
        </Notice>
      ) : (
        <div>
          <Button size="sm" variant="ghost" onClick={() => (uneven > 0 ? setConfirming(true) : void close())}>
            <Lock size={18} weight="fill" aria-hidden="true" />
            {t.sync.closeTrip}
          </Button>
        </div>
      )}
    </Setting>
  );
};

import { ArrowsClockwise, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, ErrorLine, Notice } from "../../components";
import { useDevice } from "../../device";
import { tripLinkOf, useTrip } from "../../trip";
import { Setting } from "./Setting";
import { useServerAction } from "./useServerAction";

interface TripLinkSectionProps {
  notify: (text: string) => void;
}

/** The trip link, "Copia il link" and "Rigenera il link" (online only, with a confirmation; SPEC.md §7.6 item 12). */
export const TripLinkSection = ({ notify }: TripLinkSectionProps) => {
  const { t } = useDevice();
  const { token, regenerateLink } = useTrip();
  const [confirming, setConfirming] = useState(false);
  const action = useServerAction();
  if (!token) return null;
  const link = tripLinkOf(token);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      notify(t.sync.copied);
    } catch {
      notify(t.sync.copyFailed);
    }
  };
  const regenerate = async () => {
    if (await action.run(regenerateLink)) {
      setConfirming(false);
      notify(t.sync.regened);
    }
  };

  return (
    <Setting title={t.sync.tripLink}>
      <p className="text-[13.5px] text-ink-2">{t.sync.tripLinkHelp}</p>
      <input
        readOnly
        aria-label={t.sync.linkLabel}
        value={link}
        onFocus={(event) => event.currentTarget.select()}
        className="min-h-12 w-full rounded-[14px] border-[1.5px] border-line bg-receipt px-3.5 py-2.5 text-ink focus:border-ink focus:outline-none"
      />
      <div className="flex flex-wrap gap-2.5">
        <Button size="sm" onClick={() => void copy()}>
          <Copy size={18} weight="fill" aria-hidden="true" />
          {t.sync.copyLink}
        </Button>
        {confirming ? null : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            <ArrowsClockwise size={18} weight="bold" aria-hidden="true" />
            {t.sync.regen}
          </Button>
        )}
      </div>
      {confirming ? (
        <Notice>
          <p>{t.sync.regenQ}</p>
          <div className="flex items-center gap-2.5">
            <Button size="sm" disabled={action.busy} onClick={() => void regenerate()}>
              {t.sync.regenYes}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t.shell.cancel}
            </Button>
          </div>
        </Notice>
      ) : null}
      <div role="status">{action.failure ? <ErrorLine>{action.failure === "offline" ? t.sync.onlineOnly : t.sync.actionFailed}</ErrorLine> : null}</div>
    </Setting>
  );
};

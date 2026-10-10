import { CaretLeft, CloudCheck, CloudSlash, CloudArrowUp, Lock, LockOpen, Users } from "@phosphor-icons/react";
import { Button, IconButton } from "../../components";
import { useDevice } from "../../device";
import { dateRange } from "../../format";
import { useTrip } from "../../trip";

interface TripBarProps {
  onLeave: () => void;
}

/** Back to the landing, trip name and dates, the "Sei X" label and the sync line (SPEC.md §7.5). */
export const TripBar = ({ onLeave }: TripBarProps) => {
  const { t, lang } = useDevice();
  const { trip, meId, nameOf, sync, readOnly, record } = useTrip();
  const line = {
    local: t.shell.savedLocal,
    synced: t.sync.synced,
    syncing: t.sync.syncing,
    offline: t.sync.offline(sync.pending),
    error: t.sync.error,
  }[sync.status];
  const LineIcon = sync.status === "offline" || sync.status === "error" ? CloudSlash : sync.status === "syncing" ? CloudArrowUp : CloudCheck;
  return (
    <header className="bg-paper">
      <div className="flex items-center gap-1 py-2.5 pr-2 pl-1">
        <IconButton label={t.shell.backHome} onClick={onLeave}>
          <CaretLeft size={22} weight="bold" />
        </IconButton>
        <div className="min-w-0 grow">
          <h1 className="display truncate text-[calc(23px*var(--d-scale))]">{trip.name}</h1>
          <p className="text-[13.5px] text-ink-2">{dateRange(trip.from, trip.to, lang)}</p>
        </div>
        <p className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap px-2 text-sm font-semibold text-ink-2" data-testid="me-label">
          <Users size={16} weight="fill" aria-hidden="true" />
          {t.shell.youAre(nameOf(meId))}
        </p>
      </div>
      <p className="flex items-center gap-1.5 px-4 pb-1.5 text-[13px] text-ink-2" data-testid="sync-line">
        <LineIcon size={16} weight="fill" aria-hidden="true" />
        {line}
      </p>
      {readOnly ? (
        <div className="mx-4 mb-2 flex items-center gap-2.5 rounded-[14px] bg-paper-2 px-3.5 py-2.5 text-sm" data-testid="closed-bar">
          <Lock size={20} weight="fill" aria-hidden="true" />
          <span className="grow">{t.sync.closedBanner}</span>
          <Button size="sm" onClick={() => void record({ type: "TripReopened" })}>
            <LockOpen size={18} weight="fill" aria-hidden="true" />
            {t.sync.reopen}
          </Button>
        </div>
      ) : null}
      {readOnly && trip.changesAfterClose > 0 ? (
        <p className="mx-4 mb-2 text-sm text-ink-2" data-testid="after-close">
          {t.sync.afterClose(trip.changesAfterClose)}
        </p>
      ) : null}
    </header>
  );
};

import { CaretLeft, CloudCheck, Users } from "@phosphor-icons/react";
import { IconButton } from "../../components";
import { useDevice } from "../../device";
import { dateRange } from "../../format";
import { useTrip } from "../../trip";

interface TripBarProps {
  onLeave: () => void;
  onWho: () => void;
}

/** Back to the landing, trip name and dates, the "Sei X" chip and the sync line (SPEC.md §7.5). */
export const TripBar = ({ onLeave, onWho }: TripBarProps) => {
  const { t, lang } = useDevice();
  const { trip, meId, nameOf } = useTrip();
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
        <button type="button" onClick={onWho} className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-paper-2 px-3 text-sm font-semibold">
          <Users size={16} weight="fill" aria-hidden="true" />
          {t.shell.youAre(nameOf(meId))}
        </button>
      </div>
      <p className="flex items-center gap-1.5 px-4 pb-1.5 text-[13px] text-ink-2">
        <CloudCheck size={16} weight="fill" aria-hidden="true" />
        {t.shell.savedLocal}
      </p>
    </header>
  );
};

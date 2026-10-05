import { Avatar, Chip } from "../../components";
import { useDevice } from "../../device";
import { avatarIndex, useTrip } from "../../trip";

interface WhoFilterProps {
  who: string | null;
  onChange: (who: string | null) => void;
}

/** "Di chi": the whole group or one participant, and a line saying what that does (SPEC.md §8.1). */
export const WhoFilter = ({ who, onChange }: WhoFilterProps) => {
  const { t } = useDevice();
  const { trip, meId } = useTrip();
  const chosen = trip.participants.find((p) => p.id === who);
  return (
    <div className="px-4 pt-1.5 pb-2.5 md:px-6">
      <div role="group" aria-label={t.charts.filterL} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <Chip pressed={who === null} onClick={() => onChange(null)}>
          {t.charts.group}
        </Chip>
        {trip.participants.map((p) => (
          <Chip key={p.id} pressed={who === p.id} onClick={() => onChange(p.id)}>
            <Avatar name={p.name} index={avatarIndex(trip, p.id)} size="sm" />
            {p.name}
            {p.id === meId ? <span className="font-medium"> ({t.charts.you})</span> : null}
          </Chip>
        ))}
      </div>
      <p className="mt-1.5 text-[13px] text-ink-2" data-testid="scope">
        {chosen ? t.charts.scopeWho(chosen.name) : t.charts.scopeGroup}
      </p>
    </div>
  );
};

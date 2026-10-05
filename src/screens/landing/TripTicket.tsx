import { useDevice } from "../../device";
import { dateRange } from "../../format";
import type { TripSummary } from "../../db";
import { Ticket } from "../../components";

interface TripTicketProps {
  summary: TripSummary;
  onOpen: () => void;
}

/** One trip on this device, as a ticket: name, open or closed, dates, how many people (SPEC.md §7.6 item 1). */
export const TripTicket = ({ summary, onOpen }: TripTicketProps) => {
  const { t, lang } = useDevice();
  const { trip } = summary;
  return (
    <Ticket>
      <button type="button" onClick={onOpen} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-[22px] py-[18px] text-left">
        <h3 className="display text-[calc(21px*var(--d-scale))]">{trip.name}</h3>
        <span
          className={`rounded-full px-2.5 py-[3px] text-[13px] font-bold ${
            trip.status === "open" ? "bg-[color-mix(in_srgb,var(--leaf)_30%,var(--receipt))]" : "bg-paper-2"
          }`}
        >
          {trip.status === "open" ? t.shell.open : t.shell.closed}
        </span>
        <span className="text-sm text-ink-2">{dateRange(trip.from, trip.to, lang)}</span>
        <span className="text-sm text-ink-2">{t.shell.people(trip.participants.length)}</span>
      </button>
    </Ticket>
  );
};

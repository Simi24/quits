import { Avatar } from "../../components";
import { useDevice } from "../../device";
import { avatarIndex, useTrip } from "../../trip";
import type { Totals } from "../../../domain";

/** "Pagato e spettante": what each participant paid and what their shares come to, expenses only. */
export const PaidDueList = ({ rows }: { rows: Totals["paidDue"] }) => {
  const { t } = useDevice();
  const { trip, money, nameOf } = useTrip();
  return (
    <section className="grid gap-1">
      <h2 className="display text-[calc(20px*var(--d-scale))]">{t.totals.paidVsDue}</h2>
      <ul>
        {rows.map((row) => (
          <li key={row.participantId} data-testid="paid-due-row" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 [&+&]:border-t-[1.5px] [&+&]:border-line">
            <Avatar name={nameOf(row.participantId)} index={avatarIndex(trip, row.participantId)} />
            <b className="truncate">{nameOf(row.participantId)}</b>
            <div className="num text-right text-[14.5px]">
              <div>
                <span className="text-ink-2">{t.totals.paid}</span> <b>{money(row.paid)}</b>
              </div>
              <div>
                <span className="text-ink-2">{t.totals.due}</span> <b>{money(row.due)}</b>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

import { Ticket, Button, ErrorLine } from "../../components";
import { useDevice } from "../../device";
import { instantDate } from "../../format";
import type { TripSummary } from "../../db";

interface DeletedTicketProps {
  summary: TripSummary;
  busy: boolean;
  failed: boolean;
  onRestore: () => void;
}

/** A deleted trip on this device, with "Ripristina" until its deadline (SPEC.md §7.6 item 1). */
export const DeletedTicket = ({ summary, busy, failed, onRestore }: DeletedTicketProps) => {
  const { t, lang } = useDevice();
  const { deletion } = summary.meta;
  if (!deletion) return null;
  return (
    <Ticket>
      <div className="grid gap-2 px-[22px] py-[18px]">
        <h3 className="display text-[calc(21px*var(--d-scale))]">{summary.trip.name}</h3>
        <p className="text-sm text-ink-2">{t.sync.deletedOn(instantDate(deletion.deletedAt, lang), instantDate(deletion.restoreUntil, lang))}</p>
        <div>
          <Button size="sm" disabled={busy} onClick={onRestore}>
            {busy ? t.sync.restoring : t.sync.restore}
          </Button>
        </div>
        {failed ? <ErrorLine>{t.sync.restoreFailed}</ErrorLine> : null}
      </div>
    </Ticket>
  );
};

import { Trash } from "@phosphor-icons/react";
import { Button, ErrorLine } from "../../components";
import { useDevice } from "../../device";
import { instantDate } from "../../format";
import type { Deletion } from "../../sync";
import { LinkNotice } from "./LinkNotice";

interface TripDeletedProps {
  deletion: Deletion;
  /** Who deleted it, when this device knows the trip's people. */
  deletedByName: string | null;
  /** This device has changes waiting for the trip. */
  hasQueue: boolean;
  busy: boolean;
  failed: boolean;
  onRestore: () => void;
  onBack: () => void;
}

/** A deleted trip seen from its link: who, until when, and "Ripristina" for anyone (SPEC.md §7.6 item 16). */
export const TripDeleted = ({ deletion, deletedByName, hasQueue, busy, failed, onRestore, onBack }: TripDeletedProps) => {
  const { t, lang } = useDevice();
  const date = instantDate(deletion.deletedAt, lang);
  const until = instantDate(deletion.restoreUntil, lang);
  return (
    <LinkNotice
      icon={<Trash size={40} weight="duotone" />}
      title={t.sync.deletedTitle}
      actions={
        <>
          <Button wide disabled={busy} onClick={onRestore}>
            {busy ? t.sync.restoring : t.sync.restore}
          </Button>
          <Button wide variant="ghost" onClick={onBack}>{t.shell.backHome}</Button>
        </>
      }
    >
      <p data-testid="deleted-text">{deletedByName ? t.sync.deletedBy(deletedByName, date, until) : t.sync.deletedAnon(date, until)}</p>
      {hasQueue ? <p className="text-sm text-ink-2">{t.sync.deletedKept}</p> : null}
      {failed ? <ErrorLine>{t.sync.restoreFailed}</ErrorLine> : null}
    </LinkNotice>
  );
};

import { Ghost } from "@phosphor-icons/react";
import { Button } from "../../components";
import { useDevice } from "../../device";
import { LinkNotice } from "./LinkNotice";

/** A purged trip, or a link that leads nowhere (SPEC.md §6.4). */
export const TripGone = ({ onBack }: { onBack: () => void }) => {
  const { t } = useDevice();
  return (
    <LinkNotice icon={<Ghost size={40} weight="duotone" />} title={t.sync.gone} actions={<Button wide onClick={onBack}>{t.shell.backHome}</Button>}>
      <p>{t.sync.goneHelp}</p>
    </LinkNotice>
  );
};

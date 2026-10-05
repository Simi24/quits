import { LinkBreak } from "@phosphor-icons/react";
import { Button } from "../../components";
import { useDevice } from "../../device";
import { LinkNotice } from "./LinkNotice";

/** "Il link è cambiato": the link was regenerated. Queued changes wait for the new one (SPEC.md §4). */
export const LinkChanged = ({ onBack }: { onBack: () => void }) => {
  const { t } = useDevice();
  return (
    <LinkNotice
      icon={<LinkBreak size={40} weight="duotone" />}
      title={t.sync.linkChanged}
      actions={<Button wide onClick={onBack}>{t.shell.backHome}</Button>}
    >
      <p>{t.sync.linkChangedHelp}</p>
    </LinkNotice>
  );
};

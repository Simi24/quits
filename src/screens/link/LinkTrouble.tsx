import { CloudSlash } from "@phosphor-icons/react";
import { Button } from "../../components";
import { useDevice } from "../../device";
import { LinkNotice } from "./LinkNotice";

interface LinkTroubleProps {
  kind: "offline" | "error";
  onRetry: () => void;
  onBack: () => void;
}

/** A link that could not be asked about: no connection, or a server answer nobody expected. */
export const LinkTrouble = ({ kind, onRetry, onBack }: LinkTroubleProps) => {
  const { t } = useDevice();
  return (
    <LinkNotice
      icon={<CloudSlash size={40} weight="duotone" />}
      title={kind === "offline" ? t.sync.linkOffline : t.sync.linkError}
      actions={
        <>
          <Button wide onClick={onRetry}>{t.sync.retry}</Button>
          <Button wide variant="ghost" onClick={onBack}>{t.shell.backHome}</Button>
        </>
      }
    >
      <p>{kind === "offline" ? t.sync.linkOfflineHelp : t.sync.linkErrorHelp}</p>
    </LinkNotice>
  );
};

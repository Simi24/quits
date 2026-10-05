import { ClockCounterClockwise } from "@phosphor-icons/react";
import { Button } from "../../components";
import { useDevice } from "../../device";
import { Setting } from "./Setting";

/** "Vedi la cronologia" (SPEC.md §7.6 item 12). */
export const HistorySection = ({ onOpen }: { onOpen: () => void }) => {
  const { t } = useDevice();
  return (
    <Setting title={t.history.open}>
      <Button variant="ghost" size="sm" className="justify-self-start" onClick={onOpen}>
        <ClockCounterClockwise size={18} weight="bold" aria-hidden="true" />
        {t.history.seeHistory}
      </Button>
    </Setting>
  );
};

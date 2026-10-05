import { HandCoins, Trash } from "@phosphor-icons/react";
import { Button, Sheet, Ticket } from "../../components";
import { useDevice } from "../../device";
import { dayLabel } from "../../format";
import type { SettlementRecord } from "../../../domain";
import { useTrip } from "../../trip";

interface SettlementDetailProps {
  settlement: SettlementRecord;
  onClose: () => void;
  onDeleted: (settlementId: string) => void;
}

/** The ticket of one settlement, and "Elimina il pagamento" (SPEC.md §7.6 item 9). */
export const SettlementDetail = ({ settlement, onClose, onDeleted }: SettlementDetailProps) => {
  const { t, lang } = useDevice();
  const { money, nameOf, record } = useTrip();
  const remove = async () => {
    await record({ type: "SettlementDeleted", settlementId: settlement.id });
    onDeleted(settlement.id);
  };
  return (
    <Sheet title={t.balances.settlementDetail} onClose={onClose}>
      <div className="grid gap-3.5 px-4 pb-6">
        <Ticket>
          <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5">
            <span aria-hidden="true" className="grid size-11 place-items-center rounded-full border-2 border-dashed border-ink-2">
              <HandCoins size={22} weight="fill" />
            </span>
            <span className="min-w-0">
              <b className="block leading-tight">{t.expenses.settlementLine(nameOf(settlement.fromParticipantId), nameOf(settlement.toParticipantId))}</b>
              <span className="text-[13.5px] text-ink-2">{dayLabel(settlement.date, lang)}</span>
            </span>
            <b className="num">{money(settlement.amount)}</b>
          </div>
        </Ticket>
        <Button wide variant="ghost" className="text-neg" onClick={() => void remove()}>
          <Trash size={20} weight="fill" aria-hidden="true" />
          {t.balances.delSettlement}
        </Button>
      </div>
    </Sheet>
  );
};

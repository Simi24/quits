import { HandCoins } from "@phosphor-icons/react";
import { Ticket } from "../../components";
import { useDevice } from "../../device";
import type { SettlementRecord } from "../../../domain";
import { useTrip } from "../../trip";

interface SettlementTicketProps {
  settlement: SettlementRecord;
  onOpen: () => void;
}

/** Settlements stay stamped tickets: "X ha dato a Y", "Pagamento" (SPEC.md §7.6 item 4). */
export const SettlementTicket = ({ settlement, onOpen }: SettlementTicketProps) => {
  const { t } = useDevice();
  const { money, nameOf } = useTrip();
  return (
    <Ticket>
      <button type="button" onClick={onOpen} data-testid="settlement-ticket" className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-full border-2 border-dashed border-ink-2 text-ink">
          <HandCoins size={22} weight="fill" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base leading-tight font-bold">{t.expenses.settlementLine(nameOf(settlement.fromParticipantId), nameOf(settlement.toParticipantId))}</span>
          <span className="text-[13.5px] text-ink-2">{t.expenses.settlement}</span>
        </span>
        <b className="num text-[17px]">{money(settlement.amount)}</b>
      </button>
    </Ticket>
  );
};

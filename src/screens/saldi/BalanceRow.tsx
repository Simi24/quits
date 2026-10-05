import { Avatar, EqualMark } from "../../components";
import { useDevice } from "../../device";
import { avatarIndex, useTrip } from "../../trip";

interface BalanceRowProps {
  participant: { id: string; name: string };
  balance: number;
}

/** A participant's balance in words first, then the signed amount and the "=" mark (SPEC.md §7.6 item 8). */
export const BalanceRow = ({ participant, balance }: BalanceRowProps) => {
  const { t } = useDevice();
  const { trip, meId, money } = useTrip();
  const tone = balance > 0 ? "text-pos" : balance < 0 ? "text-neg" : "text-ink-2";
  const words = balance > 0 ? t.balances.getsBack(money(balance)) : balance < 0 ? t.balances.owes(money(-balance)) : t.balances.isEven;
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3.5 [&+&]:border-t-[1.5px] [&+&]:border-line" data-testid="balance-row">
      <Avatar name={participant.name} index={avatarIndex(trip, participant.id)} />
      <div className="min-w-0">
        <b className="block truncate">
          {participant.name}
          {participant.id === meId ? <span className="font-medium text-ink-2"> ({t.balances.you})</span> : null}
        </b>
        <div className="text-sm text-ink-2">{words}</div>
      </div>
      <div className="flex items-center gap-2.5">
        <span className={`num font-bold ${tone}`}>{money(balance, { signed: true })}</span>
        <span className={tone}>
          <EqualMark mono width={22} barHeight={4.5} open={balance !== 0} />
        </span>
      </div>
    </li>
  );
};

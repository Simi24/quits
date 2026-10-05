import { Receipt, Stamp } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";

interface BalancesHeroProps {
  mine: number;
  allEven: boolean;
}

/** The hero receipt, in words first: "Ti devono 45 €" / "Devi 20 €" / "Sei pari" (SPEC.md §7.6 item 8). */
export const BalancesHero = ({ mine, allEven }: BalancesHeroProps) => {
  const { t } = useDevice();
  const { meId, nameOf, money } = useTrip();
  const words = mine > 0 ? t.balances.youGet(money(mine)) : mine < 0 ? t.balances.youOwe(money(-mine)) : t.balances.youEven;
  const tone = mine > 0 ? "text-pos" : mine < 0 ? "text-neg" : "text-ink-2";
  return (
    <Receipt className="grid gap-2 px-5 pt-[26px] pb-[30px]">
      {allEven ? <Stamp>{t.balances.evenStamp}</Stamp> : null}
      <h2 className="display text-[calc(34px*var(--d-scale))]" data-testid="balance-hero">
        {words}
      </h2>
      <p className="num">
        <span className="text-ink-2">{nameOf(meId)}</span> <span className={`font-bold ${tone}`}>{money(mine, { signed: true })}</span>
      </p>
    </Receipt>
  );
};

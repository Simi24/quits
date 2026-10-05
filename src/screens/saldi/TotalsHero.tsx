import { Receipt } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import type { Totals } from "../../../domain";

/** The trip total on a receipt, with the per-day and per-head averages under it (SPEC.md §3.11). */
export const TotalsHero = ({ totals }: { totals: Totals }) => {
  const { t } = useDevice();
  const { money } = useTrip();
  return (
    <Receipt className="grid gap-1 px-5 pt-[26px] pb-[30px]">
      <small className="text-ink-2">{t.totals.tripTotal}</small>
      <h2 className="display num text-[calc(40px*var(--d-scale))] leading-[1.05]" data-testid="totals-total">
        {money(totals.total)}
      </h2>
      <p className="mt-1.5 text-sm text-ink-2" data-testid="totals-per-day">
        {t.totals.perDay(money(totals.perDay), totals.days)}
      </p>
      <p className="text-sm text-ink-2" data-testid="totals-per-head">
        {t.totals.perHead(money(totals.perPersonPerDay))}
      </p>
      {totals.preTripTotal !== 0 ? <p className="mt-1.5 text-sm text-ink-2">{t.totals.preTrip(money(totals.preTripTotal))}</p> : null}
    </Receipt>
  );
};

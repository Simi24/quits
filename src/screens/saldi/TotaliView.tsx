import { useMemo } from "react";
import { tripTotals } from "../../../domain";
import { useTrip } from "../../trip";
import { CategoryBars } from "./CategoryBars";
import { PaidDueList } from "./PaidDueList";
import { TotalsHero } from "./TotalsHero";

/** The Totali view of the Saldi tab: trip total, paid and due, spend by category (SPEC.md §7.6 item 8). */
export const TotaliView = () => {
  const { trip } = useTrip();
  const totals = useMemo(() => tripTotals(trip), [trip]);
  return (
    <>
      <TotalsHero totals={totals} />
      <PaidDueList rows={totals.paidDue} />
      <CategoryBars rows={totals.byCategory} />
    </>
  );
};

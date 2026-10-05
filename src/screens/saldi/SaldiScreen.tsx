import { useMemo } from "react";
import { balances, suggestSettlements } from "../../../domain";
import type { SuggestedSettlement } from "../../../domain";
import { useTrip } from "../../trip";
import { BalanceRow } from "./BalanceRow";
import { BalancesHero } from "./BalancesHero";
import { SuggestedList } from "./SuggestedList";

interface SaldiScreenProps {
  onRecord: (suggestion: SuggestedSettlement | null) => void;
  onRecordAll: (suggestions: SuggestedSettlement[]) => void;
}

/** Balances and suggested settlements (SPEC.md §7.6 item 8). Totali arrives with S6. */
export const SaldiScreen = ({ onRecord, onRecordAll }: SaldiScreenProps) => {
  const { trip, meId } = useTrip();
  const owed = useMemo(() => balances(trip), [trip]);
  const suggestions = useMemo(() => suggestSettlements(trip), [trip]);
  const allEven = trip.participants.every((p) => (owed[p.id] ?? 0) === 0);

  return (
    <div className="grid gap-3.5 px-4 pt-1.5 pb-8">
      <BalancesHero mine={owed[meId] ?? 0} allEven={allEven} />
      <ul>
        {trip.participants.map((p) => (
          <BalanceRow key={p.id} participant={p} balance={owed[p.id] ?? 0} />
        ))}
      </ul>
      <SuggestedList suggestions={suggestions} onRecord={onRecord} onRecordAll={() => onRecordAll(suggestions)} onRecordOther={() => onRecord(null)} />
    </div>
  );
};

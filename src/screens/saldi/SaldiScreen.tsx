import { HandCoins, Scales } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { balances, suggestSettlements } from "../../../domain";
import type { SuggestedSettlement } from "../../../domain";
import { Button, EmptyState, Segmented } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { BalanceRow } from "./BalanceRow";
import { BalancesHero } from "./BalancesHero";
import { RecapSheet } from "./RecapSheet";
import { SuggestedList } from "./SuggestedList";
import { TotaliView } from "./TotaliView";
import { useShareRecap } from "./useShareRecap";

type View = "saldi" | "totali";

interface SaldiScreenProps {
  onRecord: (suggestion: SuggestedSettlement | null) => void;
  onRecordAll: (suggestions: SuggestedSettlement[]) => void;
  notify: (text: string) => void;
}

/** Two views in one tab: Saldi, balances and suggested settlements, and Totali (SPEC.md §7.6 item 8). */
export const SaldiScreen = ({ onRecord, onRecordAll, notify }: SaldiScreenProps) => {
  const { t } = useDevice();
  const { trip, meId, readOnly } = useTrip();
  const [view, setView] = useState<View>("saldi");
  const recap = useShareRecap(notify);
  const owed = useMemo(() => balances(trip), [trip]);
  const suggestions = useMemo(() => suggestSettlements(trip), [trip]);
  // Nothing ever recorded: a trip whose expenses were all deleted is a real, even trip and keeps its hero.
  const empty = trip.expenses.length === 0 && trip.settlements.length === 0;
  const allEven = trip.participants.every((p) => (owed[p.id] ?? 0) === 0);

  return (
    <div className="grid gap-3.5 px-4 pt-1.5 pb-8">
      <Segmented
        label={t.totals.viewLabel}
        value={view}
        onChange={setView}
        options={[
          { value: "saldi", label: t.totals.balances },
          { value: "totali", label: t.totals.totals },
        ]}
      />
      {empty ? (
        <>
          <EmptyState
            icon={<Scales size={34} weight="fill" aria-hidden="true" />}
            title={view === "totali" ? t.onboarding.emptyTotals : t.onboarding.emptyBalances}
            help={view === "totali" ? t.onboarding.emptyTotalsHelp : t.onboarding.emptyBalancesHelp}
          />
          {view === "saldi" && !readOnly ? (
            <Button wide variant="ghost" onClick={() => onRecord(null)}>
              <HandCoins size={20} weight="fill" aria-hidden="true" />
              {t.balances.recordOther}
            </Button>
          ) : null}
        </>
      ) : view === "totali" ? (
        <TotaliView />
      ) : (
        <>
          <BalancesHero mine={owed[meId] ?? 0} allEven={allEven} />
          <ul>
            {trip.participants.map((p) => (
              <BalanceRow key={p.id} participant={p} balance={owed[p.id] ?? 0} />
            ))}
          </ul>
          <SuggestedList suggestions={suggestions} onRecord={onRecord} onRecordAll={() => onRecordAll(suggestions)} onRecordOther={() => onRecord(null)} onShare={() => void recap.share()} />
        </>
      )}
      {recap.manualText ? <RecapSheet text={recap.manualText} onClose={recap.closeManual} /> : null}
    </div>
  );
};

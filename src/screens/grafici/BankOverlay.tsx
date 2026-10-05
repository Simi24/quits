import type { ChartModel } from "../../../domain";
import { Overlay } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { BankChart } from "./BankChart";
import { ChartCard } from "./ChartCard";
import { NumbersTable } from "./NumbersTable";
import { useChartFormat } from "./use-chart-format";
import { WhoFilter } from "./WhoFilter";

interface BankOverlayProps {
  model: ChartModel;
  who: string | null;
  onWho: (who: string | null) => void;
  table: boolean;
  onTable: () => void;
  onClose: () => void;
}

/** Chi ha fatto da banca, one tap away from Pagato e spettante, with the same filter (SPEC.md §8.1). */
export const BankOverlay = ({ model, who, onWho, table, onTable, onClose }: BankOverlayProps) => {
  const { t } = useDevice();
  const { nameOf } = useTrip();
  const f = useChartFormat();
  const { bank, timeline } = model;
  const final = bank.steps.at(-1)!.balances;
  const peakDate = bank.peak ? f.dayMonth(bank.peak.date) : "";

  return (
    <Overlay title={t.charts.cBank} onClose={onClose}>
      <div className="charts">
        <WhoFilter who={who} onChange={onWho} />
        <div className="grid gap-4 px-4 pt-1.5 pb-7 md:px-6">
          <p className="text-[15px]" data-testid="bank-lede">
            {bank.bankId && bank.peak ? (
              <>
                {t.charts.bankLedeA(bank.bankDays, timeline.dates.length)}
                <b className="font-bold">{nameOf(bank.bankId)}</b>
                {t.charts.bankLedeB(f.money(bank.peak.amount), peakDate)}
              </>
            ) : (
              t.charts.bankNone
            )}
          </p>
          <ChartCard id="bank" title={t.charts.cBank} sub={t.charts.bankSub} table={table} onTable={onTable}>
            {table ? (
              <NumbersTable
                head={[t.charts.thPerson, t.charts.thPeak, t.charts.thLow, t.charts.thNow]}
                rows={bank.participantIds.map((id) => [
                  nameOf(id),
                  f.signed(Math.max(0, ...bank.steps.map((s) => s.balances[id]!))),
                  f.signed(Math.min(0, ...bank.steps.map((s) => s.balances[id]!))),
                  f.signed(final[id]!),
                ])}
              />
            ) : (
              <BankChart model={model} />
            )}
          </ChartCard>
        </div>
      </div>
    </Overlay>
  );
};

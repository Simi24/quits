import type { ChartModel } from "../../../domain";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { ChartCard } from "./ChartCard";
import { CumChart } from "./CumChart";
import { NumbersTable } from "./NumbersTable";
import { useChartFormat } from "./use-chart-format";

interface HeroCardProps {
  model: ChartModel;
  table: boolean;
  onTable: () => void;
}

/** Andamento: the figure, one true sentence, the chart, and the per-day averages (SPEC.md §8.2, chart 4). */
export const HeroCard = ({ model, table, onTable }: HeroCardProps) => {
  const { t } = useDevice();
  const { trip } = useTrip();
  const f = useChartFormat();
  const { progress: p, timeline, who } = model;
  const name = trip.participants.find((x) => x.id === who)?.name;
  const running = timeline.phase === "running";
  const title = name ? (running ? t.charts.partSoFar(name) : t.charts.partAll(name)) : running ? t.charts.spentSoFar : t.charts.spentAll;

  const line = (() => {
    if (p.projection !== null && p.pace !== null) {
      return (
        <>
          {t.charts.paceLast3(f.money(p.pace))}
          <b className="text-ink">{f.about(p.projection)}</b>.
        </>
      );
    }
    if (timeline.startsOn) return t.charts.startsOn(f.dayMonth(timeline.startsOn));
    if (p.peakDay && timeline.dates.length > 1) return t.charts.endedLine(timeline.dates.length, f.day(p.peakDay.date), f.money(p.peakDay.amount));
    return null;
  })();

  const rows = timeline.dates.map((d, i): string[] =>
    i < p.solid ? [f.day(d), f.money(p.dayTotals[i]!), f.money(p.cumulative[i]!)] : [f.day(d), t.charts.est, p.projection !== null && p.pace !== null ? `≈ ${f.about(p.total + p.pace * (i - timeline.elapsed + 1))}` : "-"],
  );
  const estimates = timeline.dates.flatMap((_, i) => (i >= p.solid ? [i] : []));
  const empty = timeline.dates.length === 0;

  return (
    <ChartCard
      id="cum"
      title={t.charts.cCum}
      wide
      table={table}
      onTable={onTable}
      heading={
        <div className="grid gap-1">
          <small id="h-cum" className="text-[13.5px] text-ink-2">
            {title}
          </small>
          <b className="num display text-[calc(40px*var(--d-scale))] leading-[1.05]" data-testid="hero-total">
            {f.money(p.total)}
          </b>
          {line ? <p className="max-w-[40ch] text-[14.5px] text-ink-2">{line}</p> : null}
        </div>
      }
    >
      {empty ? (
        <p className="text-sm text-ink-2">{t.charts.noData}</p>
      ) : table ? (
        <NumbersTable head={[t.charts.thDay, t.charts.thThat, t.charts.thCum]} rows={rows} estimateRows={estimates} />
      ) : (
        <CumChart model={model} />
      )}
      <div className={`grid border-t-2 border-dashed border-line pt-3.5 ${model.heads > 1 ? "grid-cols-2" : ""}`}>
        <div>
          <b className="num block text-lg font-bold" data-testid="per-day">
            {f.money(p.perDay)}
          </b>
          <small className="block text-[13px] text-ink-2">{t.charts.perDay}</small>
        </div>
        {model.heads > 1 ? (
          <div className="border-l-2 border-dashed border-line pl-3.5">
            <b className="num block text-lg font-bold" data-testid="per-head-day">
              {f.money(p.perPersonPerDay)}
            </b>
            <small className="block text-[13px] text-ink-2">{t.charts.perHeadDay}</small>
          </div>
        ) : null}
      </div>
    </ChartCard>
  );
};

import type { ChartModel } from "../../../domain";
import { resolveCategory } from "../../../domain";
import { Segmented } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { categoryName } from "../../trip/labels";
import { ChartCard } from "./ChartCard";
import { DaysChart } from "./DaysChart";
import { NumbersTable } from "./NumbersTable";
import { textureOf } from "./textures";
import { useChartFormat } from "./use-chart-format";

export type DayMode = "group" | "head";

interface DaysCardProps {
  model: ChartModel;
  sub: string;
  mode: DayMode;
  onMode: (mode: DayMode) => void;
  patterns: boolean;
  table: boolean;
  onTable: () => void;
}

/** Per giorno with the Totale / A testa switch (charts 2 and 6, SPEC.md §8.2). */
export const DaysCard = ({ model, sub, mode, onMode, patterns, table, onTable }: DaysCardProps) => {
  const { t, lang } = useDevice();
  const { trip } = useTrip();
  const f = useChartFormat();
  const head = mode === "head";
  const heavy = trip.participants
    .map((p) => ({ name: p.name, shares: trip.defaultSplit.method === "shares" ? (trip.defaultSplit.shares[p.id] ?? 1) : 1 }))
    .filter((p) => p.shares > 1);
  const subline = head && model.heads > 1 ? [t.charts.dayHeadSub(model.heads), heavy.length ? t.charts.headsNote(heavy.map((p) => `${p.name} (${p.shares})`).join(", ")) : ""].filter(Boolean).join(" ") : sub;
  const { buckets } = model.days;

  return (
    <ChartCard id="day" title={t.charts.cDay} sub={subline} table={table} onTable={onTable}>
      <Segmented
        label={t.charts.dmLabel}
        value={mode}
        onChange={onMode}
        options={[
          { value: "group", label: t.charts.dmGroup },
          { value: "head", label: t.charts.dmHead },
        ]}
      />
      {buckets.length === 0 ? (
        <p className="text-sm text-ink-2">{t.charts.noData}</p>
      ) : table ? (
        <NumbersTable
          head={[t.charts.thDay, t.charts.thThat, t.charts.thHead]}
          rows={buckets.map((b) => [b.date ? f.day(b.date) : t.charts.preTrip, f.money(b.total), f.money(Math.round(b.total / model.heads))])}
        />
      ) : (
        <>
          <DaysChart model={model} perHead={head} patterns={patterns} />
          <div className="legend" data-testid="days-legend">
            {model.categories.map((r) => {
              const c = resolveCategory(trip, r.categoryId);
              const tx = textureOf(c, patterns);
              return (
                <span key={r.categoryId}>
                  <i className={`sw ${tx ? `tx-${tx}` : ""}`} style={{ "--c": `var(--${c.color})` } as React.CSSProperties} />
                  {c.emoji} {categoryName(c, lang)}
                  {head ? <b className="num"> {f.money(r.perPersonPerDay)}</b> : null}
                </span>
              );
            })}
          </div>
        </>
      )}
    </ChartCard>
  );
};

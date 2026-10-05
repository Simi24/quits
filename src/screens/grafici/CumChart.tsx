import { AreaClosed, LinePath } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { axisTicks } from "../../../domain";
import type { ChartModel } from "../../../domain";
import { useDevice } from "../../device";
import { DayAxis } from "./DayAxis";
import { LabelPill } from "./LabelPill";
import type { ReadoutData } from "./readout";
import { ReadoutRow } from "./ReadoutRow";
import { ScrubArea } from "./ScrubArea";
import { useChartFormat } from "./use-chart-format";
import { useSelection } from "./use-selection";
import { useWidth } from "./use-width";
import { YAxis } from "./YAxis";

interface CumChartProps {
  model: ChartModel;
}

const H = 196;
const PT = 20;
const PB = 36;
const PL = 46;
const PR = 2;

/** Chart 4: the running total, with the pace and a dashed projection while the trip runs (SPEC.md §8.2). */
export const CumChart = ({ model }: CumChartProps) => {
  const { t } = useDevice();
  const f = useChartFormat();
  const { ref, width: W } = useWidth<HTMLDivElement>();
  const sel = useSelection<number>();
  const { progress: p, timeline } = model;
  const dates = timeline.dates;
  const D = dates.length;
  const pw = W - PL - PR;
  const band = pw / D;
  const xc = (i: number) => PL + (i + 0.5) * band;
  const running = timeline.phase === "running";
  const n = timeline.elapsed;
  const projAt = (i: number) => (p.projection === null || p.pace === null ? 0 : p.total + p.pace * (i - (n - 1)));
  const top = Math.max(p.projection ?? 0, ...p.cumulative, 1);
  const axis = axisTicks(Math.min(0, ...p.cumulative), top, 3);
  const y = scaleLinear({ domain: [axis.min, axis.max], range: [H - PB, PT] });
  const solid = Math.max(1, p.solid);
  const points = [{ x: PL, v: 0 }, ...p.cumulative.slice(0, solid).map((v, i) => ({ x: xc(i), v }))];
  const last = Math.min(solid, D) - 1;
  const count = p.projection !== null ? D : Math.max(1, solid);

  const read = (i: number): ReadoutData => {
    if (i < solid) return { title: t.charts.untilDay(f.day(dates[i]!)), value: f.money(p.cumulative[i]!), notes: [t.charts.thatDay(f.money(p.dayTotals[i]!))] };
    if (p.projection !== null) return { title: t.charts.estFor(f.day(dates[i]!)), value: `≈ ${f.about(projAt(i))}`, notes: [t.charts.paceNote] };
    return { title: t.charts.untilDay(f.day(dates[i]!)), value: f.money(p.cumulative.at(-1) ?? 0) };
  };
  const index = sel.active;
  const data = index !== null && index < count ? read(index) : null;
  const closeToEnd = p.projection !== null && D - n < 3;

  return (
    <div ref={sel.ref} className="grid gap-2.5">
      <div ref={ref} className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="group" aria-label={`${t.charts.cCum}: ${f.money(p.total)}`}>
          {running ? <rect x={PL + n * band} y={PT - 6} width={pw - n * band} height={H - PB - PT + 6} rx={8} style={{ fill: "var(--future)" }} /> : null}
          <YAxis scale={y} ticks={axis.ticks} left={PL} right={W - PR} format={f.whole} />
          <AreaClosed data={points} x={(d) => d.x} y={(d) => y(d.v)} yScale={y} className="later area" />
          <line className="base" x1={PL} x2={W - PR} y1={y(0)} y2={y(0)} />
          <LinePath data={points} x={(d) => d.x} y={(d) => y(d.v)} className="draw line-lead" pathLength={1} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {p.projection !== null ? (
            <g className="later">
              <line x1={xc(n - 1)} y1={y(p.cumulative[n - 1]!)} x2={xc(D - 1)} y2={y(p.projection)} className="line-lead" strokeWidth={2.5} strokeDasharray="5 5" strokeLinecap="round" opacity={0.85} />
              <circle cx={xc(D - 1)} cy={y(p.projection)} r={4.5} className="dot-open" strokeWidth={2.5} />
              <LabelPill x={W - PR} y={y(p.projection) - 12} text={`≈ ${f.about(p.projection)}`} />
            </g>
          ) : null}
          {D > 0 ? (
            <g className="later">
              <circle cx={xc(last)} cy={y(p.cumulative[last] ?? 0)} r={5.5} className="dot-lead" strokeWidth={2.5} />
              <LabelPill
                x={closeToEnd ? xc(last) - 10 : last === 0 ? xc(last) + 10 : xc(last) - 10}
                y={closeToEnd ? y(p.cumulative[last] ?? 0) + 22 : y(p.cumulative[last] ?? 0) - 12}
                text={f.whole(p.cumulative[last] ?? 0)}
                anchor={closeToEnd || last > 0 ? "end" : "start"}
              />
            </g>
          ) : null}
          <DayAxis
            band={band}
            x={xc}
            y={H - 18}
            columns={dates.map((d, i) => ({ top: f.weekday(d), bottom: f.dayNumber(d), dim: running && i >= n, today: timeline.todayIndex === i }))}
          />
          {index !== null && index < count ? (
            <g className="xh" pointerEvents="none">
              <line x1={xc(index)} x2={xc(index)} y1={PT - 6} y2={H - PB} />
              <circle cx={xc(index)} cy={y(index < solid ? p.cumulative[index]! : projAt(index))} r={5} className="dot-ink" strokeWidth={2} />
            </g>
          ) : null}
          <ScrubArea
            x={PL}
            width={pw}
            height={H}
            count={count}
            start={Math.max(0, last)}
            indexAt={(px) => Math.floor((px - PL) / band)}
            selected={index}
            onPin={sel.setPinned}
            onHover={sel.setHovered}
            label={t.charts.cCum}
            valueText={data ? [data.title, data.value].filter(Boolean).join(", ") : f.money(p.total)}
          />
        </svg>
      </div>
      <div className="legend">
        <span>
          <i className="key-line" />
          {t.charts.spent}
        </span>
        {p.projection !== null ? (
          <span>
            <i className="key-dash" />
            {t.charts.est}
          </span>
        ) : null}
      </div>
      <ReadoutRow data={data} hintKind="scrub" />
    </div>
  );
};

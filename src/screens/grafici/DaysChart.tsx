import { Bar } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { useId } from "react";
import { axisTicks, resolveCategory } from "../../../domain";
import type { ChartModel, ResolvedCategory } from "../../../domain";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { categoryName } from "../../trip/labels";
import { DayAxis } from "./DayAxis";
import { LabelPill } from "./LabelPill";
import type { ReadoutData } from "./readout";
import { ReadoutRow } from "./ReadoutRow";
import { ScrubArea } from "./ScrubArea";
import { textureOf } from "./textures";
import { useChartFormat } from "./use-chart-format";
import { useSelection } from "./use-selection";
import { useWidth } from "./use-width";
import { YAxis } from "./YAxis";

interface DaysChartProps {
  model: ChartModel;
  perHead: boolean;
  patterns: boolean;
}

const H = 214;
const PT = 24;
const PB = 36;
const PL = 46;
const PR = 2;

/** Charts 2 and 6: columns stacked by category in the fixed order, refunds below zero, the average line (SPEC.md §8.2). */
export const DaysChart = ({ model, perHead, patterns }: DaysChartProps) => {
  const { t, lang } = useDevice();
  const { trip } = useTrip();
  const f = useChartFormat();
  const uid = useId().replace(/:/g, "");
  const { ref, width: W } = useWidth<HTMLDivElement>();
  const sel = useSelection<number>();
  const { days, timeline, progress } = model;
  const div = perHead ? model.heads : 1;
  const buckets = days.buckets;
  const offset = timeline.hasPre ? 1 : 0;
  const pw = W - PL - PR;
  const band = pw / Math.max(1, buckets.length);
  const bw = Math.min(24, band * 0.62);
  const xc = (i: number) => PL + (i + 0.5) * band;
  const cats = days.order.map((id) => resolveCategory(trip, id));
  const running = timeline.phase === "running";

  const pos = buckets.map((b) => cats.reduce((s, c) => s + Math.max(0, b.byCategory[c.id] ?? 0), 0) / div);
  const neg = buckets.map((b) => cats.reduce((s, c) => s + Math.min(0, b.byCategory[c.id] ?? 0), 0) / div);
  const axis = axisTicks(Math.min(0, ...neg) * 1.1, Math.max(1, ...pos), 3);
  const y = scaleLinear({ domain: [axis.min, axis.max], range: [H - PB, PT] });
  const y0 = y(0);
  const avg = progress.perDay / div;
  const avgEnd = PL + (offset + timeline.elapsed) * band;
  const peak = days.peak;

  const read = (i: number): ReadoutData => {
    const b = buckets[i]!;
    const mode = perHead ? ` ${lang === "it" ? "a testa" : "each"}` : "";
    return {
      title: b.date ? f.day(b.date) : t.charts.preTrip,
      value: f.money(b.total / div) + mode,
      rows: cats
        .filter((c) => (b.byCategory[c.id] ?? 0) !== 0)
        .map((c) => ({ color: `var(--${c.color})`, label: `${c.emoji} ${categoryName(c, lang)}`, value: f.money(b.byCategory[c.id]! / div) })),
    };
  };
  const index = sel.active;
  const data = index !== null && index < buckets.length ? read(index) : null;

  const segments = (b: (typeof buckets)[number], i: number, sign: 1 | -1) => {
    const present = cats.filter((c) => (sign > 0 ? (b.byCategory[c.id] ?? 0) > 0 : (b.byCategory[c.id] ?? 0) < 0));
    let run = 0;
    return present.map((c: ResolvedCategory, k) => {
      const v = b.byCategory[c.id]! / div;
      const from = y(run);
      const to = y(run + v);
      run += v;
      const first = k === 0;
      const lastOne = k === present.length - 1;
      const top = sign > 0 ? to + (lastOne ? 0 : 1) : from + (first ? 0 : 1);
      const h = Math.abs(from - to) - (first ? 0 : 1) - (lastOne ? 0 : 1);
      const tx = textureOf(c, patterns);
      if (h <= 0) return null;
      return (
        <g key={`${i}-${c.id}`}>
          <Bar x={xc(i) - bw / 2} y={top} width={bw} height={h} style={{ fill: `var(--${c.color})` }} />
          {tx ? <Bar x={xc(i) - bw / 2} y={top} width={bw} height={h} fill={`url(#tx-${tx})`} /> : null}
        </g>
      );
    });
  };

  return (
    <div ref={sel.ref} className="grid gap-2.5">
      <div ref={ref} className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="group" aria-label={t.charts.cDay}>
          <defs>
            {buckets.map((b, i) => (
              <g key={i}>
                <clipPath id={`${uid}p${i}`}>
                  <rect x={xc(i) - bw / 2} y={y(pos[i]!)} width={bw} height={y0 - y(pos[i]!) + 8} rx={4} />
                </clipPath>
                <clipPath id={`${uid}n${i}`}>
                  <rect x={xc(i) - bw / 2} y={y0 - 8} width={bw} height={y(neg[i]!) - y0 + 8} rx={4} />
                </clipPath>
              </g>
            ))}
          </defs>
          <YAxis scale={y} ticks={axis.ticks} left={PL} right={W - PR} format={f.whole} />
          {buckets.map((b, i) => (
            <g key={i} className="gy" style={{ transformOrigin: `0 ${y0}px`, animationDelay: `${i * 45}ms` }}>
              <g clipPath={`url(#${uid}p${i})`}>{segments(b, i, 1)}</g>
              <g clipPath={`url(#${uid}n${i})`}>{segments(b, i, -1)}</g>
            </g>
          ))}
          <line className="base" x1={PL} x2={W - PR} y1={y0} y2={y0} />
          {peak >= 0 ? (
            <g className="later">
              <text className="strong" x={Math.min(Math.max(xc(peak), 26), W - 26)} y={y(pos[peak]!) - 7} textAnchor="middle">
                {f.whole(buckets[peak]!.total / div)}
              </text>
            </g>
          ) : null}
          {timeline.elapsed > 1 && avg > 0 ? (
            <g className="later">
              <line x1={PL} x2={avgEnd} y1={y(avg)} y2={y(avg)} className="line-ink" strokeWidth={1.5} />
              <LabelPill x={Math.min(avgEnd, W - PR)} y={y(avg) - 7} text={t.charts.avg(f.whole(avg))} />
            </g>
          ) : null}
          <DayAxis
            band={band}
            x={xc}
            y={H - 18}
            columns={buckets.map((b, i) => ({
              top: b.date ? f.weekday(b.date) : t.charts.preShort,
              bottom: b.date ? f.dayNumber(b.date) : "",
              dim: running && i - offset >= timeline.elapsed,
              today: timeline.todayIndex !== null && i - offset === timeline.todayIndex,
            }))}
          />
          {index !== null && index < buckets.length ? (
            <g className="xh" pointerEvents="none">
              <line x1={xc(index)} x2={xc(index)} y1={PT - 6} y2={H - PB} />
            </g>
          ) : null}
          <ScrubArea
            x={PL}
            width={pw}
            height={H}
            count={buckets.length}
            start={peak >= 0 ? peak : Math.max(0, buckets.length - 1)}
            indexAt={(px) => Math.floor((px - PL) / band)}
            selected={index}
            onPin={sel.setPinned}
            onHover={sel.setHovered}
            label={t.charts.cDay}
            valueText={data ? [data.title, data.value].filter(Boolean).join(", ") : t.charts.cDay}
          />
        </svg>
      </div>
      <ReadoutRow data={data} hintKind="scrub" />
    </div>
  );
};

import { scaleLinear } from "@visx/scale";
import { useId } from "react";
import type { ChartModel } from "../../../domain";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { DayAxis } from "./DayAxis";
import type { ReadoutData } from "./readout";
import { ReadoutRow } from "./ReadoutRow";
import { ScrubArea } from "./ScrubArea";
import { useChartFormat } from "./use-chart-format";
import { useSelection } from "./use-selection";
import { useWidth } from "./use-width";

interface BankChartProps {
  model: ChartModel;
}

const ROW = 70;
const LABEL = 22;
const PH = 38;
const AXIS = 34;
const PAD = 2;

/** Chart 8: each person's running balance as small multiples on one shared scale; settlements are dots (SPEC.md §8.2). */
export const BankChart = ({ model }: BankChartProps) => {
  const { t } = useDevice();
  const { nameOf } = useTrip();
  const f = useChartFormat();
  const uid = useId().replace(/:/g, "");
  const { ref, width: W } = useWidth<HTMLDivElement>();
  const sel = useSelection<number>();
  const { bank, timeline } = model;
  const ids = bank.participantIds;
  const D = Math.max(1, timeline.dates.length);
  const H = ids.length * ROW + AXIS;
  const pw = W - 2 * PAD;
  const x = scaleLinear({ domain: [0, D], range: [PAD, W - PAD] });
  const lo = Math.min(bank.lo, -1);
  const hi = Math.max(bank.hi, 1);
  const running = timeline.phase === "running";
  const xs = bank.steps.map((s) => x(s.t));

  const read = (k: number): ReadoutData => {
    const step = bank.steps[k]!;
    const e = step.event;
    const what = !e
      ? t.charts.start
      : e.kind === "expense"
        ? `${e.description} (${f.money(e.amount)})`
        : `${t.charts.settleL(nameOf(e.fromParticipantId), nameOf(e.toParticipantId))} (${f.money(e.amount)})`;
    return {
      title: e ? f.day(e.date) : timeline.dates[0] ? f.day(timeline.dates[0]) : t.charts.start,
      rows: ids.map((id) => ({ color: step.balances[id]! >= 0 ? "var(--pos)" : "var(--neg)", label: nameOf(id), value: f.signed(step.balances[id]!) })),
      notes: [e ? t.charts.after(what) : what],
    };
  };
  const index = sel.active;
  const data = index !== null && index < bank.steps.length ? read(index) : null;

  return (
    <div ref={sel.ref} className="grid gap-2.5">
      <div ref={ref} className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={t.charts.cBank}>
          <defs>
            {ids.map((id, r) => {
              const top = r * ROW + LABEL;
              const y0 = top + (PH * hi) / (hi - lo);
              return (
                <g key={id}>
                  <clipPath id={`${uid}u${r}`}>
                    <rect x={0} y={top - 2} width={W} height={y0 - top + 2} />
                  </clipPath>
                  <clipPath id={`${uid}d${r}`}>
                    <rect x={0} y={y0} width={W} height={top + PH - y0 + 2} />
                  </clipPath>
                </g>
              );
            })}
          </defs>
          {running ? <rect x={x(bank.horizon)} y={0} width={x(D) - x(bank.horizon)} height={ids.length * ROW - 6} rx={8} style={{ fill: "var(--future)" }} /> : null}
          {Array.from({ length: Math.max(0, D - 1) }, (_, k) => (
            <line key={k} className="gl" x1={x(k + 1)} x2={x(k + 1)} y1={LABEL - 2} y2={ids.length * ROW - 8} />
          ))}
          {ids.map((id, r) => {
            const top = r * ROW + LABEL;
            const yv = scaleLinear({ domain: [lo, hi], range: [top + PH, top] });
            const y0 = yv(0);
            let d = `M${x(0).toFixed(1)} ${y0.toFixed(1)}`;
            bank.steps.forEach((s, k) => {
              if (k) d += `H${xs[k]!.toFixed(1)}`;
              d += `V${yv(s.balances[id]!).toFixed(1)}`;
            });
            d += `H${x(Math.max(bank.horizon, bank.steps.at(-1)?.t ?? 0)).toFixed(1)}`;
            const area = `${d}V${y0.toFixed(1)}Z`;
            const final = bank.steps.at(-1)!.balances[id]!;
            return (
              <g key={id} opacity={model.who && model.who !== id ? 0.35 : 1}>
                <text className="strong" x={PAD} y={top - 8}>
                  {nameOf(id)}
                </text>
                <text className="strong" x={W - PAD} y={top - 8} textAnchor="end">
                  {f.signed(final)}
                </text>
                <g className="later">
                  <path d={area} clipPath={`url(#${uid}u${r})`} style={{ fill: "color-mix(in srgb, var(--pos) 20%, transparent)" }} />
                  <path d={area} clipPath={`url(#${uid}d${r})`} style={{ fill: "color-mix(in srgb, var(--neg) 18%, transparent)" }} />
                </g>
                <line className="base" x1={PAD} x2={W - PAD} y1={y0} y2={y0} opacity={0.6} />
                <path d={d} clipPath={`url(#${uid}u${r})`} fill="none" style={{ stroke: "var(--pos)" }} strokeWidth={2} strokeLinejoin="round" />
                <path d={d} clipPath={`url(#${uid}d${r})`} fill="none" style={{ stroke: "var(--neg)" }} strokeWidth={2} strokeLinejoin="round" />
                {bank.steps.map((s, k) =>
                  s.event?.kind === "settlement" && (s.event.fromParticipantId === id || s.event.toParticipantId === id) ? (
                    <circle key={k} cx={xs[k]} cy={yv(s.balances[id]!)} r={4} className="dot-ink" strokeWidth={2} />
                  ) : null,
                )}
              </g>
            );
          })}
          <DayAxis
            band={pw / D}
            x={(i) => x(i + 0.5)}
            y={H - 18}
            columns={timeline.dates.map((date, i) => ({ top: f.weekday(date), bottom: f.dayNumber(date), dim: running && i >= timeline.elapsed, today: timeline.todayIndex === i }))}
          />
          {index !== null && index < bank.steps.length ? (
            <g className="xh" pointerEvents="none">
              <line x1={xs[index]} x2={xs[index]} y1={0} y2={ids.length * ROW - 8} />
            </g>
          ) : null}
          <ScrubArea
            x={PAD}
            width={pw}
            height={H}
            count={bank.steps.length}
            start={bank.steps.length - 1}
            indexAt={(px) => xs.reduce((best, p, k) => (Math.abs(p - px) < Math.abs(xs[best]! - px) ? k : best), 0)}
            selected={index}
            onPin={sel.setPinned}
            onHover={sel.setHovered}
            label={t.charts.cBank}
            valueText={data ? [data.title, ...(data.notes ?? [])].join(", ") : t.charts.cBank}
          />
        </svg>
      </div>
      <div className="legend">
        <span><i className="sw" style={{ "--c": "color-mix(in srgb, var(--pos) 45%, var(--receipt))" } as React.CSSProperties} />{t.charts.fronted}</span>
        <span><i className="sw" style={{ "--c": "color-mix(in srgb, var(--neg) 40%, var(--receipt))" } as React.CSSProperties} />{t.charts.owing}</span>
        <span><i className="sw rounded-full" style={{ "--c": "var(--ink)" } as React.CSSProperties} />{t.charts.settlementKey}</span>
      </div>
      <ReadoutRow data={data} hintKind="scrub" />
    </div>
  );
};

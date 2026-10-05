import { AxisLeft } from "@visx/axis";
import type { scaleLinear } from "@visx/scale";

interface YAxisProps {
  scale: ReturnType<typeof scaleLinear<number>>;
  ticks: number[];
  left: number;
  right: number;
  format: (value: number) => string;
}

/** Amounts on the left, a grid line at each tick; the zero line is drawn by the chart itself (SPEC.md §8.1: axes start at zero). */
export const YAxis = ({ scale, ticks, left, right, format }: YAxisProps) => (
  <>
    {ticks
      .filter((v) => v !== 0)
      .map((v) => (
        <line key={v} className="gl" x1={left} x2={right} y1={scale(v)} y2={scale(v)} />
      ))}
    <AxisLeft
      scale={scale}
      left={left}
      tickValues={ticks}
      tickFormat={(v) => format(Number(v))}
      hideAxisLine
      hideTicks
      tickLabelProps={() => ({ dx: -6, dy: 4, textAnchor: "end" as const })}
    />
  </>
);

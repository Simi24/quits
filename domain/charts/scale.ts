/** Round axis values for the charts, in minor units (SPEC.md §8.6). Pure, so every device draws the same axis. */

/** The smallest of 1, 2, 2.5, 5, 10 times a power of ten that covers `max` in `count` steps; never below one unit. */
export function niceStep(max: number, count = 4): number {
  const raw = Math.max(max, 1) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? magnitude * 10;
  return Math.max(1, step);
}

export type Axis = { ticks: number[]; min: number; max: number };

/** Ticks from the step at or below `low` (zero when nothing is negative) to the step at or above `high`. */
export function axisTicks(low: number, high: number, count = 3): Axis {
  const step = niceStep(Math.max(high, -low, 1), count);
  const min = low < 0 ? Math.floor(low / step) * step : 0;
  const max = Math.max(Math.ceil(high / step) * step, step);
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(v);
  return { ticks, min, max };
}

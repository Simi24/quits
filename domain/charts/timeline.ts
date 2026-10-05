import type { Trip } from "../trip.ts";

export type Phase =
  /** Missing start or end date: no projection and no "today" (SPEC.md §8.3). */
  | "undated"
  /** Today is before the first day: the charts show what exists. */
  | "before"
  | "running"
  | "ended";

export type Timeline = {
  phase: Phase;
  /** Trip days, ISO dates, inclusive. The "before the trip" bucket is not one of them. */
  dates: string[];
  /** Days gone, today included: 0 before the start, all of them once over or undated. */
  elapsed: number;
  /** Index of today in `dates`; only while the trip runs. */
  todayIndex: number | null;
  /** The start date, while the trip has not begun. */
  startsOn: string | null;
  /** Some expense is dated before the start date (bookings): it goes in "Prima del viaggio". */
  hasPre: boolean;
};

const DAY = 86_400_000;
const MAX_DAYS = 1100;
const dayNumber = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY);
const isoOf = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);

/** Whole days from `a` to `b`. */
export const daysBetween = (a: string, b: string) => dayNumber(b) - dayNumber(a);

/** The day axis of the charts: the trip's own days, or the span of the expenses when it has no dates (SPEC.md §8.3). */
export function buildTimeline(trip: Trip, today: string | null): Timeline {
  const live = trip.expenses.filter((e) => !e.deleted).map((e) => e.snapshot.date);
  const { from, to } = trip;
  const counted = from === null ? live : live.filter((d) => d >= from);
  const hasPre = from !== null && counted.length < live.length;
  const sorted = [...counted].sort();
  const first = from ?? sorted[0];
  const last = [to, sorted.at(-1)].filter((d): d is string => d != null).sort().at(-1) ?? first;
  if (first === undefined || last === undefined) {
    return { phase: "undated", dates: [], elapsed: 0, todayIndex: null, startsOn: null, hasPre };
  }
  const count = Math.min(MAX_DAYS, Math.max(1, daysBetween(first, last) + 1));
  const dates = Array.from({ length: count }, (_, i) => isoOf(dayNumber(first) + i));
  const dated = from !== null && to !== null;
  const base = { dates, hasPre };
  if (!dated) return { ...base, phase: "undated", elapsed: count, todayIndex: null, startsOn: null };
  if (today === null || today >= dates[count - 1]!) return { ...base, phase: "ended", elapsed: count, todayIndex: null, startsOn: null };
  if (today < first) return { ...base, phase: "before", elapsed: 0, todayIndex: null, startsOn: first };
  const todayIndex = daysBetween(first, today);
  return { ...base, phase: "running", elapsed: todayIndex + 1, todayIndex, startsOn: null };
}

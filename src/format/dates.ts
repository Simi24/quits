import { intlLocale } from "./money";
import type { Locale } from "./money";

const noon = (iso: string) => new Date(`${iso}T12:00`);
const noDash = (text: string) => text.replace(/\s?[–—]\s?/g, "-");

export const dayLabel = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", day: "numeric", month: "long" }).format(noon(iso));

export const longDate = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric" }).format(noon(iso));

/** "13 - 20 giugno 2026": a hyphen, never an en dash (SPEC.md §7.7). */
export function dateRange(from: string | null, to: string | null, locale: Locale): string {
  if (!from) return "";
  if (!to) return longDate(from, locale);
  return noDash(
    new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric" }).formatRange(noon(from), noon(to)),
  );
}

export const listNames = (names: string[], locale: Locale) =>
  new Intl.ListFormat(intlLocale(locale), { type: "conjunction" }).format(names);

/** Today in the device's calendar, as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

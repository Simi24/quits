import { useMemo } from "react";
import { minorDigits } from "../../../domain";
import { useDevice } from "../../device";
import { intlLocale, listNames } from "../../format";
import { useTrip } from "../../trip";

const noon = (iso: string) => new Date(`${iso}T12:00`);

/** Money, percentages and dates for the charts, in the trip currency and the interface language (SPEC.md §3.4, §7.7). */
export function useChartFormat() {
  const { lang } = useDevice();
  const { trip } = useTrip();
  return useMemo(() => {
    const locale = intlLocale(lang);
    const currency = trip.currency;
    const digits = minorDigits(currency);
    const number = (minor: number, options: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, { style: "currency", currency, ...options }).format(minor / 10 ** digits);
    const date = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options).format(noon(iso));
    const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
    const roundTo = 10 ** (digits + 1);
    return {
      lang,
      currency,
      money: (minor: number) => number(minor, {}),
      signed: (minor: number) => number(minor, { signDisplay: "exceptZero" }),
      /** Whole units, no symbol: for crowded cells. */
      plain: (minor: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(minor / 10 ** digits)),
      symbol: new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0).find((part) => part.type === "currency")?.value ?? currency,
      whole: (minor: number) => number(minor, { maximumFractionDigits: 0, minimumFractionDigits: 0 }),
      /** A rounded estimate: to the nearest 10 units of the currency. */
      about: (minor: number) => number(Math.round(minor / roundTo) * roundTo, { maximumFractionDigits: 0, minimumFractionDigits: 0 }),
      percent: (share: number) => (share > 0 && share < 0.01 ? `<${percent.format(0.01)}` : percent.format(share)),
      day: (iso: string) => date(iso, { weekday: "short", day: "numeric", month: "long" }),
      dayMonth: (iso: string) => date(iso, { day: "numeric", month: "long" }),
      dayMonthShort: (iso: string) => date(iso, { day: "numeric", month: "short" }),
      weekday: (iso: string) => date(iso, { weekday: "short" }).replace(".", ""),
      dayNumber: (iso: string) => date(iso, { day: "numeric" }),
      range: (a: string, b: string) =>
        a === b
          ? date(a, { day: "numeric", month: "long" })
          : new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).formatRange(noon(a), noon(b)).replace(/\s?[–—]\s?/g, "-"),
      list: (names: string[]) => listNames(names, lang),
    };
  }, [lang, trip.currency]);
}

export type ChartFormat = ReturnType<typeof useChartFormat>;

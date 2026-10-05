import { longDate, todayIso } from "./dates";
import { intlLocale } from "./money";
import type { Locale } from "./money";

/** A server timestamp (ISO 8601) as a long date in the device's calendar. */
export const instantDate = (instant: string, locale: Locale): string => longDate(todayIso(new Date(instant)), locale);

/** A timestamp as a short date and time, for the lines of the history. */
export const instantTime = (instant: string, locale: Locale): string =>
  new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(instant));

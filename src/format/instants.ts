import { longDate, todayIso } from "./dates";
import type { Locale } from "./money";

/** A server timestamp (ISO 8601) as a long date in the device's calendar. */
export const instantDate = (instant: string, locale: Locale): string => longDate(todayIso(new Date(instant)), locale);

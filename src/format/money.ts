import { minorDigits } from "../../domain";

export type Locale = "it" | "en";

const INTL: Record<Locale, string> = { it: "it-IT", en: "en-GB" };
export const intlLocale = (locale: Locale): string => INTL[locale];

/** Formats minor units through Intl with the trip currency and the UI locale (SPEC.md §3.4). */
export function formatMoney(minor: number, currency: string, locale: Locale, options: { signed?: boolean } = {}): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat(INTL[locale], {
    style: "currency",
    currency,
    signDisplay: options.signed ? "exceptZero" : "auto",
  }).format(minor / 10 ** digits);
}

/**
 * Reads what someone typed into an amount field, as minor units, or null.
 * "12,5", "1.234,56", "12.5" and "1,234.56" all work; the last comma or dot with one or two digits after it is the decimal mark.
 */
export function parseAmount(input: string, currency: string): number | null {
  const cleaned = input.replace(/[\s€$£¥]/g, "");
  if (cleaned === "") return null;
  const decimal = cleaned.match(/^(.*?)[.,](\d{1,2})$/);
  const whole = (decimal ? decimal[1] : cleaned)!.replace(/[.,]/g, "");
  const fraction = decimal ? decimal[2]! : "";
  if (!/^\d*$/.test(whole) || (whole === "" && fraction === "")) return null;
  const digits = minorDigits(currency);
  const minor =
    digits === 0
      ? Number(whole || "0") + (fraction === "" ? 0 : Math.round(Number(`0.${fraction}`)))
      : Number(whole || "0") * 10 ** digits + Number(fraction.padEnd(digits, "0").slice(0, digits));
  // Past the safe integers the operation schema refuses the amount, so it is no amount at all here.
  return Number.isSafeInteger(minor) ? minor : null;
}

/** An amount as the field shows it: no currency symbol, the locale's decimal mark. */
export function amountToInput(minor: number, currency: string, locale: Locale): string {
  const digits = minorDigits(currency);
  const text = (Math.abs(minor) / 10 ** digits).toFixed(digits);
  return locale === "it" ? text.replace(".", ",") : text;
}

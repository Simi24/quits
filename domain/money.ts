/** Decimal digits of a currency's minor unit (ISO 4217): 2 for EUR, 0 for JPY (SPEC.md §3.4). */
export function minorDigits(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

import type { ParticipantId } from "./ids.ts";
import { minorDigits } from "./money.ts";
import { formatIban, hasPaymentDetails, paymentDetailsOf } from "./payment-details.ts";
import type { PaymentDetails } from "./payment-details.ts";
import type { Trip } from "./trip.ts";

export type PaymentAction =
  | { method: "iban" | "satispay"; kind: "copy"; value: string }
  /** `withAmount`: the link carries the amount; when false the profile opens and the payer types it. */
  | { method: "paypal" | "revolut"; kind: "open"; url: string; withAmount: boolean };

/**
 * The currencies PayPal.me can be asked for with a code after the amount: PayPal's list of supported currencies,
 * without the three that work in-country only (BRL, CNY, MYR) and the two that take whole amounts only (HUF, TWD).
 * https://developer.paypal.com/docs/reports/reference/paypal-supported-currencies/
 */
const PAYPAL_CURRENCIES = new Set([
  "AUD", "CAD", "CHF", "CZK", "DKK", "EUR", "GBP", "HKD", "ILS", "JPY", "MXN", "NOK", "NZD", "PHP", "PLN", "SEK", "SGD", "THB", "USD",
]);

/** `45.50`, `45` or `4500`: whole units with the decimals the currency has, none when they are zero. */
function decimalAmount(minor: number, currency: string): string {
  const digits = minorDigits(currency);
  if (digits === 0) return String(minor);
  const whole = Math.trunc(minor / 10 ** digits);
  const cents = String(minor % 10 ** digits).padStart(digits, "0");
  return /^0+$/.test(cents) ? String(whole) : `${whole}.${cents}`;
}

/**
 * What the payer can tap to pay a creditor: copy the IBAN or the Satispay number (Satispay documents no payment
 * link), open PayPal.me with the amount when PayPal takes the currency, open the Revolut profile (no amount: none
 * is documented). Money never passes through Quits.
 */
export function paymentActions(details: PaymentDetails, pay: { amount: number; currency: string }): PaymentAction[] {
  const actions: PaymentAction[] = [];
  if (details.iban) actions.push({ method: "iban", kind: "copy", value: details.iban });
  if (details.paypal) {
    const profile = `https://paypal.me/${details.paypal}`;
    const withAmount = PAYPAL_CURRENCIES.has(pay.currency);
    const url = withAmount ? `${profile}/${decimalAmount(pay.amount, pay.currency)}${pay.currency}` : profile;
    actions.push({ method: "paypal", kind: "open", url, withAmount });
  }
  if (details.revolut) actions.push({ method: "revolut", kind: "open", url: `https://revolut.me/${details.revolut}`, withAmount: false });
  if (details.satispayPhone) actions.push({ method: "satispay", kind: "copy", value: details.satispayPhone });
  return actions;
}

/** The recap's line for a creditor, `Name: IBAN ... | paypal.me/x | revolut.me/y | Satispay +39...`, or no line when they have no details. */
export function paymentRecapLines(trip: Trip, creditorId: ParticipantId): string[] {
  const details = paymentDetailsOf(trip, creditorId);
  if (!hasPaymentDetails(details)) return [];
  const methods = [
    details.iban && `IBAN ${formatIban(details.iban)}`,
    details.paypal && `paypal.me/${details.paypal}`,
    details.revolut && `revolut.me/${details.revolut}`,
    details.satispayPhone && `Satispay ${details.satispayPhone}`,
  ].filter(Boolean);
  const name = trip.participants.find((p) => p.id === creditorId)?.name ?? creditorId;
  return [`${name}: ${methods.join(" | ")}`];
}

import { z } from "zod";
import type { ParticipantId } from "./ids.ts";
import type { Trip } from "./trip.ts";

/** The fields a person can fill in to say how they want to receive money (SPEC.md §3.16). All optional. */
export const PAYMENT_FIELDS = ["iban", "paypal", "revolut", "satispayPhone"] as const;
export type PaymentField = (typeof PAYMENT_FIELDS)[number];

/** In canonical form: what travels in an operation and what every device shows. */
export type PaymentDetails = { [F in PaymentField]?: string };

const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
const PAYPAL = /^[A-Za-z0-9]{1,20}$/;
const REVOLUT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;
const PHONE = /^\+[1-9]\d{7,14}$/;

/** ISO 13616 check: move the first four characters to the end, letters become 10..35, the number mod 97 must be 1. */
function ibanChecksumHolds(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = char >= "A" ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

const isIban = (value: string) => IBAN.test(value) && ibanChecksumHolds(value);

const canonicalIban = (typed: string) => typed.replace(/\s+/g, "").toUpperCase();

/** Whatever follows `host/` in a pasted link, or the text itself; without a leading @, query or path. */
const handleOf = (typed: string, host: string) =>
  typed
    .trim()
    .replace(new RegExp(`^(https?://)?(www\\.)?${host}/`, "i"), "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0] ?? "";

const canonicalPhone = (typed: string) => {
  const compact = typed.replace(/[\s().-]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
};

const checks: Record<PaymentField, { canonical: (typed: string) => string; valid: (value: string) => boolean }> = {
  iban: { canonical: canonicalIban, valid: isIban },
  paypal: { canonical: (typed) => handleOf(typed, "paypal\\.me"), valid: (v) => PAYPAL.test(v) },
  revolut: { canonical: (typed) => handleOf(typed, "revolut\\.me"), valid: (v) => REVOLUT.test(v) },
  satispayPhone: { canonical: canonicalPhone, valid: (v) => PHONE.test(v) },
};

export interface PaymentDetailsCheck {
  /** The fields that were filled in and are valid, in canonical form. */
  details: PaymentDetails;
  /** The fields that were filled in and are not valid. */
  errors: { [F in PaymentField]?: "invalid" };
}

/** Turns what a person typed into canonical details, and says which fields cannot be used. Blank fields are simply left out. */
export function checkPaymentDetails(typed: { [F in PaymentField]?: string }): PaymentDetailsCheck {
  const details: PaymentDetails = {};
  const errors: PaymentDetailsCheck["errors"] = {};
  for (const field of PAYMENT_FIELDS) {
    const raw = typed[field]?.trim();
    if (!raw) continue;
    const value = checks[field].canonical(raw);
    if (checks[field].valid(value)) details[field] = value;
    else errors[field] = "invalid";
  }
  return { details, errors };
}

const field = (f: PaymentField) => z.string().refine((v) => checks[f].valid(v) && checks[f].canonical(v) === v);

/** Payment details as they travel: already canonical, so every device reads the same text. `{}` clears them. */
export const paymentDetailsSchema = z.strictObject({
  iban: field("iban").optional(),
  paypal: field("paypal").optional(),
  revolut: field("revolut").optional(),
  satispayPhone: field("satispayPhone").optional(),
});

/** An IBAN in groups of four, for reading and for copying into a banking app. */
export const formatIban = (iban: string) => iban.replace(/(.{4})(?=.)/g, "$1 ");

export const hasPaymentDetails = (details: PaymentDetails | undefined): details is PaymentDetails =>
  details !== undefined && PAYMENT_FIELDS.some((f) => details[f] !== undefined);

/**
 * How to pay a participant, merges applied (SPEC.md §3.16): their own details; if they have none, those of the
 * first participant folded into them, in order of entry, that has some. Undoing the merge gives each back their own.
 */
export function paymentDetailsOf(trip: Trip, participantId: ParticipantId): PaymentDetails | undefined {
  const own = trip.paymentDetails[participantId];
  if (own) return own;
  for (const entry of trip.roster) {
    const target = trip.mergedInto[entry.id];
    if (target === participantId && trip.paymentDetails[entry.id]) return trip.paymentDetails[entry.id];
  }
  return undefined;
}

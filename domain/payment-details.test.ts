import { describe, expect, it } from "vitest";
import { checkPaymentDetails, formatIban, hasPaymentDetails, paymentDetailsSchema } from "./index.ts";

// Worked examples from the IBAN registry and the national bank documentation: valid by construction.
const IT = "IT60X0542811101000000123456";
const DE = "DE89370400440532013000";
const GB = "GB82WEST12345698765432";

describe("payment details: normalising what a person typed", () => {
  it("writes the IBAN in capitals with no spaces", () => {
    const { details, errors } = checkPaymentDetails({ iban: " it60 x054 2811 1010 0000 0123 456 " });
    expect(details).toEqual({ iban: IT });
    expect(errors).toEqual({});
  });

  it("accepts the three registry examples", () => {
    for (const iban of [IT, DE, GB]) expect(checkPaymentDetails({ iban }).errors).toEqual({});
  });

  it("refuses an IBAN whose check digits do not match, however well-formed it looks", () => {
    expect(checkPaymentDetails({ iban: "IT60X0542811101000000123457" }).errors).toEqual({ iban: "invalid" });
    expect(checkPaymentDetails({ iban: "IT61X0542811101000000123456" }).errors).toEqual({ iban: "invalid" });
  });

  it("refuses an IBAN that is too short, too long or has no country", () => {
    for (const iban of ["IT60", "1234567890123456", `${IT}${IT}`, "IT6OX0542811101000000123456"]) {
      expect(checkPaymentDetails({ iban }).errors).toEqual({ iban: "invalid" });
    }
  });

  it("keeps only the PayPal.me username, from a bare name or a pasted link", () => {
    for (const typed of ["mariorossi", "@mariorossi", "paypal.me/mariorossi", "https://www.paypal.me/mariorossi/20EUR", "PayPal.Me/mariorossi?x=1"]) {
      expect(checkPaymentDetails({ paypal: typed }).details).toEqual({ paypal: "mariorossi" });
    }
  });

  it("refuses a PayPal.me username PayPal cannot have (symbols, spaces, over 20 characters)", () => {
    for (const paypal of ["mario rossi", "mario-rossi", "mario_rossi", "a".repeat(21)]) {
      expect(checkPaymentDetails({ paypal }).errors).toEqual({ paypal: "invalid" });
    }
  });

  it("keeps only the Revolut username, from a bare name, a revtag or a pasted link", () => {
    for (const typed of ["mario123", "@mario123", "revolut.me/mario123", "https://revolut.me/mario123"]) {
      expect(checkPaymentDetails({ revolut: typed }).details).toEqual({ revolut: "mario123" });
    }
    expect(checkPaymentDetails({ revolut: "mario rossi" }).errors).toEqual({ revolut: "invalid" });
  });

  it("refuses a Revolut name that is only dots, so the link can never point above the profile path", () => {
    for (const revolut of [".", "..", ".mario", "-mario"]) expect(checkPaymentDetails({ revolut }).errors).toEqual({ revolut: "invalid" });
    expect(paymentDetailsSchema.safeParse({ revolut: ".." }).success).toBe(false);
  });

  it("writes the Satispay phone in international form, from the usual ways people write it", () => {
    for (const typed of ["+39 333 123 4567", "0039 333-123-4567", "+39 (333) 123.4567", "+393331234567"]) {
      expect(checkPaymentDetails({ satispayPhone: typed }).details).toEqual({ satispayPhone: "+393331234567" });
    }
  });

  it("refuses a phone with no international prefix or the wrong length: it never guesses a country", () => {
    for (const satispayPhone of ["333 123 4567", "+39", "+0123456789", "+1234567890123456", "+39 abc"]) {
      expect(checkPaymentDetails({ satispayPhone }).errors).toEqual({ satispayPhone: "invalid" });
    }
  });

  it("drops empty fields, and reports every wrong one at once", () => {
    const { details, errors } = checkPaymentDetails({ iban: "  ", paypal: "no no", revolut: "ok1", satispayPhone: "12" });
    expect(details).toEqual({ revolut: "ok1" });
    expect(errors).toEqual({ paypal: "invalid", satispayPhone: "invalid" });
  });
});

describe("payment details: the shape that travels", () => {
  it("accepts the canonical form and an empty object (which clears)", () => {
    expect(paymentDetailsSchema.safeParse({ iban: IT, paypal: "mario", revolut: "mario1", satispayPhone: "+393331234567" }).success).toBe(true);
    expect(paymentDetailsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects what is not canonical, so every device reads the same text", () => {
    for (const bad of [{ iban: "it60 x054 2811 1010 0000 0123 456" }, { iban: "IT60X0542811101000000123457" }, { paypal: "a b" }, { satispayPhone: "3331234567" }, { extra: "x" }, { iban: "" }]) {
      expect(paymentDetailsSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("payment details: reading them", () => {
  it("groups an IBAN by four for reading", () => {
    expect(formatIban(IT)).toBe("IT60 X054 2811 1010 0000 0123 456");
  });

  it("tells whether there is anything to pay with", () => {
    expect(hasPaymentDetails(undefined)).toBe(false);
    expect(hasPaymentDetails({})).toBe(false);
    expect(hasPaymentDetails({ paypal: "mario" })).toBe(true);
  });
});

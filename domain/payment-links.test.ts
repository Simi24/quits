import { describe, expect, it } from "vitest";
import { paymentActions } from "./index.ts";

const all = { iban: "IT60X0542811101000000123456", paypal: "sara", revolut: "sara1", satispayPhone: "+393331234567" };

describe("one-tap ways to pay (SPEC.md §3.16)", () => {
  it("offers a way for each thing the creditor filled in, in a fixed order", () => {
    expect(paymentActions(all, { amount: 4550, currency: "EUR" })).toEqual([
      { method: "iban", kind: "copy", value: "IT60X0542811101000000123456" },
      { method: "paypal", kind: "open", url: "https://paypal.me/sara/45.50EUR", withAmount: true },
      { method: "revolut", kind: "open", url: "https://revolut.me/sara1", withAmount: false },
      { method: "satispay", kind: "copy", value: "+393331234567" },
    ]);
  });

  it("offers nothing for what was not filled in", () => {
    expect(paymentActions({ revolut: "sara1" }, { amount: 100, currency: "EUR" }).map((a) => a.method)).toEqual(["revolut"]);
    expect(paymentActions({}, { amount: 100, currency: "EUR" })).toEqual([]);
  });

  it("writes whole amounts with no decimals and keeps the cents otherwise", () => {
    const url = (amount: number) => paymentActions({ paypal: "sara" }, { amount, currency: "EUR" })[0];
    expect(url(2500)).toMatchObject({ url: "https://paypal.me/sara/25EUR" });
    expect(url(5)).toMatchObject({ url: "https://paypal.me/sara/0.05EUR" });
    expect(url(2510)).toMatchObject({ url: "https://paypal.me/sara/25.10EUR" });
  });

  it("writes a zero-decimal currency in whole units", () => {
    expect(paymentActions({ paypal: "sara" }, { amount: 4500, currency: "JPY" })[0]).toMatchObject({ url: "https://paypal.me/sara/4500JPY" });
  });

  it("opens the PayPal profile with no amount when PayPal does not take the currency, or takes it only in-country", () => {
    for (const currency of ["BRL", "CNY", "MYR", "HUF", "TWD", "KRW", "ISK", "TRY"]) {
      expect(paymentActions({ paypal: "sara" }, { amount: 4550, currency })[0]).toEqual({ method: "paypal", kind: "open", url: "https://paypal.me/sara", withAmount: false });
    }
  });

  it("never puts the amount in the Revolut link: Revolut does not document one", () => {
    expect(paymentActions({ revolut: "sara1" }, { amount: 4550, currency: "EUR" })[0]).toEqual({ method: "revolut", kind: "open", url: "https://revolut.me/sara1", withAmount: false });
  });
});

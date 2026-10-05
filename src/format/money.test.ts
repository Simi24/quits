import { describe, expect, it } from "vitest";
import { amountToInput, formatMoney, parseAmount } from "./money";

describe("parseAmount", () => {
  it("reads a comma decimal, with or without thousands dots", () => {
    expect(parseAmount("12,5", "EUR")).toBe(1250);
    expect(parseAmount("1.234,56", "EUR")).toBe(123456);
  });

  it("reads a dot decimal, with or without thousands commas", () => {
    expect(parseAmount("12.5", "EUR")).toBe(1250);
    expect(parseAmount("1,234.56", "EUR")).toBe(123456);
  });

  it("ignores spaces and currency symbols", () => {
    expect(parseAmount(" € 8,00 ", "EUR")).toBe(800);
  });

  it("uses the minor digits of the currency", () => {
    expect(parseAmount("500", "JPY")).toBe(500);
    expect(parseAmount("500", "EUR")).toBe(50000);
  });

  it("is null when there is no amount", () => {
    expect(parseAmount("", "EUR")).toBeNull();
    expect(parseAmount("abc", "EUR")).toBeNull();
  });

  it("never goes through a float error", () => {
    expect(parseAmount("0,29", "EUR")).toBe(29);
    expect(parseAmount("1.005", "EUR")).toBe(100500);
  });
});

describe("amountToInput", () => {
  it("writes the amount the way the locale types it", () => {
    expect(amountToInput(12345, "EUR", "it")).toBe("123,45");
    expect(amountToInput(-12345, "EUR", "en")).toBe("123.45");
    expect(amountToInput(500, "JPY", "it")).toBe("500");
  });
});

describe("formatMoney", () => {
  it("formats through Intl with the trip currency and the locale", () => {
    expect(formatMoney(1540000, "EUR", "it")).toBe("15.400,00\u00a0€");
    expect(formatMoney(1540000, "EUR", "en")).toBe("€15,400.00");
  });

  it("can force a sign", () => {
    expect(formatMoney(1250, "EUR", "en", { signed: true })).toBe("+€12.50");
    expect(formatMoney(0, "EUR", "en", { signed: true })).toBe("€0.00");
  });
});

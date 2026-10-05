import { describe, expect, it } from "vitest";
import { minorDigits } from "./index.ts";

describe("minorDigits", () => {
  it("is the ISO 4217 number of decimals of the currency", () => {
    expect(minorDigits("EUR")).toBe(2);
    expect(minorDigits("USD")).toBe(2);
    expect(minorDigits("JPY")).toBe(0);
    expect(minorDigits("KWD")).toBe(3);
  });
});

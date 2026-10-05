import { describe, expect, it } from "vitest";
import { tokenFromInput } from "./parse-link";

const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";

describe("tokenFromInput, what 'Apri o incolla un link di viaggio' accepts", () => {
  it("takes a full link", () => expect(tokenFromInput(`https://quits.simonepetta.com/v/#${TOKEN}`)).toBe(TOKEN));
  it("takes a link without the scheme", () => expect(tokenFromInput(`quits.simonepetta.com/v/#${TOKEN}`)).toBe(TOKEN));
  it("takes a bare token", () => expect(tokenFromInput(TOKEN)).toBe(TOKEN));
  it("ignores the spaces and line breaks a message adds around it", () => expect(tokenFromInput(`  \n${TOKEN}\n`)).toBe(TOKEN));
  it("takes a link from a local or other host", () => expect(tokenFromInput(`http://localhost:8787/v/#${TOKEN}`)).toBe(TOKEN));

  it.each([
    ["nothing", ""],
    ["a link with no fragment", "https://quits.simonepetta.com/v/"],
    ["an empty fragment", "https://quits.simonepetta.com/v/#"],
    ["words", "ciao a tutti"],
    ["a token of the wrong length", "abc123"],
    ["a link to another page", `https://example.com/page#${TOKEN}`],
  ])("refuses %s", (_label, input) => expect(tokenFromInput(input)).toBeNull());
});

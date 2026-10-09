import { describe, expect, it } from "vitest";
import { foldTrip, buildRecap, paymentRecapLines } from "./index.ts";
import { op, sequence, tripCreated } from "./testing.ts";
import { sardegnaOperations } from "./sardegna.fixture.ts";

const LINK = "https://quits.simonepetta.com/v/#abcdefghijklmnopqrstuv";
// A stand-in for the app's formatter: the builder must use whatever it is given, not format on its own.
const money = (minor: number) => `${(minor / 100).toFixed(2)} EUR`;
const sardegna = () => foldTrip(sequence(sardegnaOperations()));

describe("buildRecap", () => {
  it("lists the current suggested settlements of the Sardegna trip, in Italian", () => {
    expect(buildRecap({ trip: sardegna(), lang: "it", money, link: LINK })).toBe(
      [
        "Quits · Sardegna 2026",
        "Pagamenti per andare pari:",
        "• Chiara → Sara: 375.51 EUR",
        "• Luca → Sara: 145.70 EUR",
        "• Luca → Giulia e Marco: 87.61 EUR",
        "• Luca → Simone: 69.11 EUR",
        "Totale del viaggio: 4565.18 EUR",
        `Apri il viaggio: ${LINK}`,
      ].join("\n"),
    );
  });

  it("speaks English when asked", () => {
    const lines = buildRecap({ trip: sardegna(), lang: "en", money, link: LINK }).split("\n");
    expect(lines[1]).toBe("Payments to settle up:");
    expect(lines.at(-2)).toBe("Trip total: 4565.18 EUR");
    expect(lines.at(-1)).toBe(`Open the trip: ${LINK}`);
  });

  it("says everyone is even instead of listing payments", () => {
    const trip = foldTrip(sequence([tripCreated()]));
    expect(buildRecap({ trip, lang: "it", money, link: LINK }).split("\n")).toEqual([
      "Quits · Sardegna",
      "Siamo tutti pari.",
      "Totale del viaggio: 0.00 EUR",
      `Apri il viaggio: ${LINK}`,
    ]);
    expect(buildRecap({ trip, lang: "en", money, link: LINK }).split("\n")[1]).toBe("Everyone is settled up.");
  });

  it("follows the current suggestions: a recorded payment is gone from the recap", () => {
    const base = sardegnaOperations();
    const paid = op({ type: "SettlementRecorded", settlementId: "s-recap", fromParticipantId: "p5", toParticipantId: "p2", amount: 37551, date: "2026-06-21" }, { id: "recap-paid" });
    const text = buildRecap({ trip: foldTrip(sequence([...base, paid])), lang: "en", money, link: LINK });
    expect(text).not.toContain("Chiara →");
    expect(text).toContain("• Luca → Sara: 145.70 EUR");
  });

  it("leaves out the link line when the device has no link", () => {
    const lines = buildRecap({ trip: sardegna(), lang: "en", money, link: null }).split("\n");
    expect(lines.at(-1)).toBe("Trip total: 4565.18 EUR");
  });

  it("appends the extra lines a caller has for a creditor, after the payments", () => {
    const text = buildRecap({ trip: sardegna(), lang: "it", money, link: LINK, extraLines: (id) => (id === "p2" ? ["Sara: IBAN IT00"] : []) });
    const lines = text.split("\n");
    expect(lines.indexOf("Sara: IBAN IT00")).toBe(lines.indexOf("• Luca → Simone: 69.11 EUR") + 1);
  });

  describe("with payment details (SPEC.md §3.16)", () => {
    const details = (participantId: string, d: Record<string, string>) => op({ type: "ParticipantPaymentDetailsSet", participantId, details: d }, { id: `pay-${participantId}` });
    const withDetails = () =>
      foldTrip(sequence([...sardegnaOperations(), details("p2", { iban: "IT60X0542811101000000123456", paypal: "sara", revolut: "sara1", satispayPhone: "+393331234567" }), details("p1", { revolut: "simo" })]));
    const recap = (lang: "it" | "en") => buildRecap({ trip: withDetails(), lang, money, link: LINK, extraLines: (id) => paymentRecapLines(withDetails(), id) }).split("\n");

    it("adds one line per creditor who has details, after the payments, with every method they filled in", () => {
      const lines = recap("it");
      const last = lines.indexOf("• Luca → Simone: 69.11 EUR");
      expect(lines.slice(last + 1, last + 3)).toEqual([
        "Sara: IBAN IT60 X054 2811 1010 0000 0123 456 | paypal.me/sara | revolut.me/sara1 | Satispay +393331234567",
        "Simone: revolut.me/simo",
      ]);
      expect(lines[last + 3]).toBe("Totale del viaggio: 4565.18 EUR");
    });

    it("adds nothing for a creditor with none, and nothing for a debtor who has some", () => {
      expect(paymentRecapLines(sardegna(), "p2")).toEqual([]);
      const lines = recap("en");
      expect(lines.some((l) => l.startsWith("Chiara:"))).toBe(false);
    });
  });
});

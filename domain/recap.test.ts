import { describe, expect, it } from "vitest";
import { foldTrip, buildRecap } from "./index.ts";
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
});

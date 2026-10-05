import { describe, expect, it } from "vitest";
import { buildTripCreation, newTripIssues } from "./new-trip";
import type { NewTripForm } from "./new-trip";

const form = (changes: Partial<NewTripForm> = {}): NewTripForm => ({
  name: "Sardegna 2026",
  currency: "EUR",
  from: "2026-06-13",
  to: "2026-06-20",
  people: ["Simone", "Sara"],
  defaultMethod: "equal",
  shares: [1, 1],
  ...changes,
});

describe("newTripIssues", () => {
  it("accepts a name, two people and ordered dates", () => {
    expect(newTripIssues(form())).toEqual([]);
  });

  it("asks for a name and for at least two people", () => {
    expect(newTripIssues(form({ name: " ", people: ["Simone"] }))).toEqual(["name_missing", "people_missing"]);
  });

  it("refuses an end date before the start", () => {
    expect(newTripIssues(form({ from: "2026-06-20", to: "2026-06-13" }))).toEqual(["dates_reversed"]);
  });

  it("accepts a trip with one date or none", () => {
    expect(newTripIssues(form({ from: "", to: "" }))).toEqual([]);
    expect(newTripIssues(form({ to: "" }))).toEqual([]);
  });
});

describe("buildTripCreation", () => {
  it("makes the creator's own name the author, first in the list", () => {
    const { tripId, operation } = buildTripCreation(form(), "device-1");
    expect(operation.type).toBe("TripCreated");
    if (operation.type !== "TripCreated") return;
    expect(operation.participants.map((p) => p.name)).toEqual(["Simone", "Sara"]);
    expect(operation.by).toBe(operation.participants[0]?.id);
    expect(operation.device).toBe("device-1");
    expect(tripId).toMatch(/[0-9a-f-]{36}/);
  });

  it("keys the default split by participant id and trims names", () => {
    const { operation } = buildTripCreation(form({ people: [" Giulia e Marco ", "Luca"], defaultMethod: "shares", shares: [2, 1] }), "d");
    if (operation.type !== "TripCreated") throw new Error("wrong operation");
    const [giulia, luca] = operation.participants;
    expect(operation.participants[0]?.name).toBe("Giulia e Marco");
    expect(operation.defaultSplit).toEqual({ method: "shares", shares: { [giulia!.id]: 2, [luca!.id]: 1 } });
  });

  it("writes empty dates as null", () => {
    const { operation } = buildTripCreation(form({ from: "", to: "" }), "d");
    if (operation.type !== "TripCreated") throw new Error("wrong operation");
    expect([operation.from, operation.to]).toEqual([null, null]);
  });
});

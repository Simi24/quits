import { describe, expect, it } from "vitest";
import { CURRENT_VERSION, foldTrip, parseOperation, paymentDetailsOf } from "./index.ts";
import { op, sequence, tripCreated } from "./testing.ts";

const IT = "IT60X0542811101000000123456";
const DE = "DE89370400440532013000";

const fold = (...ops: ReturnType<typeof op>[]) => foldTrip(sequence([tripCreated(), ...ops]));
const setDetails = (participantId: string, details: Record<string, unknown>, meta = {}) =>
  op({ type: "ParticipantPaymentDetailsSet", participantId, details }, meta);
const merge = (from: string, into: string, id = `merge-${from}-${into}`) =>
  op({ type: "ParticipantsMerged", fromParticipantId: from, intoParticipantId: into }, { id });

describe("payment details in the fold", () => {
  it("a participant has none until they say how to be paid", () => {
    expect(paymentDetailsOf(fold(), "p1")).toBeUndefined();
  });

  it("the last one written by server sequence wins, whole: fields are not merged", () => {
    const trip = fold(setDetails("p2", { iban: IT, paypal: "sara" }), setDetails("p2", { revolut: "sara1" }));
    expect(paymentDetailsOf(trip, "p2")).toEqual({ revolut: "sara1" });
  });

  it("two devices writing at once converge on the one the server sequenced last", () => {
    const a = setDetails("p2", { iban: IT }, { id: "a", device: "dev-a", at: "2026-06-02T10:00:00Z" });
    const b = setDetails("p2", { iban: DE }, { id: "b", device: "dev-b", at: "2026-06-01T10:00:00Z" });
    expect(paymentDetailsOf(foldTrip(sequence([tripCreated(), a, b])), "p2")).toEqual({ iban: DE });
    expect(paymentDetailsOf(foldTrip(sequence([tripCreated(), b, a])), "p2")).toEqual({ iban: IT });
  });

  it("an empty object clears them", () => {
    const trip = fold(setDetails("p2", { iban: IT }), setDetails("p2", {}));
    expect(paymentDetailsOf(trip, "p2")).toBeUndefined();
  });

  it("anyone can set anyone's details, and each participant keeps their own", () => {
    const trip = fold(setDetails("p3", { paypal: "luca" }, { by: "p1" }), setDetails("p2", { iban: IT }, { by: "p2" }));
    expect(paymentDetailsOf(trip, "p3")).toEqual({ paypal: "luca" });
    expect(paymentDetailsOf(trip, "p2")).toEqual({ iban: IT });
    expect(paymentDetailsOf(trip, "p1")).toBeUndefined();
  });

  it("ignores details for someone who is not in the trip, and says why in the history", () => {
    const trip = fold(setDetails("ghost", { iban: IT }, { id: "x" }));
    expect(trip.history.find((h) => h.opId === "x")?.ignored).toBe("unknown_participant");
  });

  it("the details do not change balances or anything else the trip adds up to", () => {
    const plain = fold();
    const withDetails = fold(setDetails("p2", { iban: IT }));
    expect({ ...withDetails, history: [], lastSeq: 0, paymentDetails: {} }).toEqual({ ...plain, history: [], lastSeq: 0, paymentDetails: {} });
  });
});

describe("payment details and merges (SPEC.md §3.16)", () => {
  it("the survivor keeps their own details; the merged-away ones are not shown", () => {
    const trip = fold(setDetails("p2", { iban: IT }), setDetails("p3", { paypal: "luca" }), merge("p3", "p2"));
    expect(paymentDetailsOf(trip, "p2")).toEqual({ iban: IT });
  });

  it("a survivor with none inherits the merged-away participant's", () => {
    const trip = fold(setDetails("p3", { paypal: "luca" }), merge("p3", "p2"));
    expect(paymentDetailsOf(trip, "p2")).toEqual({ paypal: "luca" });
  });

  it("undoing the merge gives each back their own", () => {
    const trip = fold(setDetails("p3", { paypal: "luca" }), merge("p3", "p2", "m"), op({ type: "MergeUndone", mergeOpId: "m" }));
    expect(paymentDetailsOf(trip, "p2")).toBeUndefined();
    expect(paymentDetailsOf(trip, "p3")).toEqual({ paypal: "luca" });
  });

  it("inherits through a chain of merges, from the first in order of entry that has some", () => {
    const trip = fold(setDetails("p3", { paypal: "luca" }), setDetails("p2", { revolut: "sara1" }), merge("p3", "p2"), merge("p2", "p1"));
    expect(paymentDetailsOf(trip, "p1")).toEqual({ revolut: "sara1" });
  });
});

describe("payment details and older apps (SPEC.md §3.13)", () => {
  const written = setDetails("p2", { iban: IT });

  it("is written in the current version, not a new one: an app that cannot read it holds it back alone (src/sync/sync-trip.test.ts) and keeps reading everything else", () => {
    expect(written.v).toBe(CURRENT_VERSION);
  });

  it("is a well-formed operation of the current version", () => {
    expect(parseOperation(JSON.parse(JSON.stringify(written)))).toEqual({ ok: true, operation: written });
  });

  it("is refused when the details are not canonical or carry anything else", () => {
    for (const details of [{ iban: "IT60X0542811101000000123457" }, { iban: "it60 x054" }, { phone: "+393331234567" }, { paypal: "a b" }]) {
      expect(parseOperation(setDetails("p2", details))).toMatchObject({ ok: false, reason: "malformed" });
    }
  });
});

import { describe, expect, it } from "vitest";
import { CURRENT_VERSION, balances, foldTrip, parseOperation } from "./index.ts";
import { expenseCreated, op, sequence, tripCreated } from "./testing.ts";

const identityChanged = (participantId: string, meta = {}) => op({ type: "IdentityChanged", participantId }, { by: "p1", ...meta });
const fold = (...ops: ReturnType<typeof op>[]) => foldTrip(sequence([tripCreated(), ...ops]));
const merge = (from: string, into: string) => op({ type: "ParticipantsMerged", fromParticipantId: from, intoParticipantId: into });

describe("IdentityChanged: validation", () => {
  it("accepts a device that was Simone saying it is now Sara", () => {
    expect(parseOperation(identityChanged("p2")).ok).toBe(true);
  });

  it("refuses a change to the identity the device already has (by is the identity before the change)", () => {
    const parsed = parseOperation(identityChanged("p1"));
    expect(parsed).toMatchObject({ ok: false, reason: "malformed" });
  });

  it("is written in the current schema version, with no bump: a later version is still unknown (SPEC.md §3.13)", () => {
    expect(identityChanged("p2").v).toBe(CURRENT_VERSION);
    expect(parseOperation({ ...identityChanged("p2"), v: CURRENT_VERSION + 1 })).toMatchObject({ ok: false, reason: "unknown_version" });
  });

  it("refuses a payload with anything else in it", () => {
    expect(parseOperation({ ...identityChanged("p2"), name: "x" }).ok).toBe(false);
  });
});

describe("IdentityChanged: the fold", () => {
  it("is a history line by the old identity and changes nothing else", () => {
    const withExpense = [expenseCreated("e1")];
    const plain = fold(...withExpense);
    const changed = fold(...withExpense, identityChanged("p2", { id: "who" }));
    const line = changed.history.find((h) => h.opId === "who");
    expect(line).toMatchObject({ type: "IdentityChanged", by: "p1", ignored: null });
    expect(balances(changed)).toEqual(balances(plain));
    expect({ ...changed, history: [], lastSeq: 0 }).toEqual({ ...plain, history: [], lastSeq: 0 });
  });

  it("ignores a target who is not in the trip, and says why", () => {
    expect(fold(identityChanged("ghost", { id: "x" })).history.find((h) => h.opId === "x")?.ignored).toBe("unknown_participant");
  });

  it("ignores a target who was removed", () => {
    const removed = op({ type: "ParticipantAdded", participantId: "p9", name: "Anna" });
    const gone = op({ type: "ParticipantRemoved", participantId: "p9" });
    expect(fold(removed, gone, identityChanged("p9", { id: "x" })).history.find((h) => h.opId === "x")?.ignored).toBe("unknown_participant");
  });

  it("ignores a target who was merged away", () => {
    expect(fold(merge("p3", "p2"), identityChanged("p3", { id: "x" })).history.find((h) => h.opId === "x")?.ignored).toBe("unknown_participant");
  });

  it("is not a change after the trip was closed", () => {
    const trip = fold(op({ type: "TripClosed" }), identityChanged("p2", { id: "x" }));
    expect(trip.changesAfterClose).toBe(0);
    expect(trip.history.find((h) => h.opId === "x")?.afterClose).toBe(false);
  });
});

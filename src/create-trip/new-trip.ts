import { buildOperation } from "../trip";
import type { Operation } from "../../domain";

export interface NewTripForm {
  name: string;
  currency: string;
  from: string;
  to: string;
  /** The creator's own name first (SPEC.md §3.2). */
  people: string[];
  defaultMethod: "equal" | "shares";
  /** Shares per person, in the order of `people`. */
  shares: number[];
}

export type NewTripIssue = "name_missing" | "people_missing" | "dates_reversed";

export function newTripIssues(form: NewTripForm): NewTripIssue[] {
  const issues: NewTripIssue[] = [];
  if (form.name.trim() === "") issues.push("name_missing");
  if (form.people.length < 2) issues.push("people_missing");
  if (form.from && form.to && form.to < form.from) issues.push("dates_reversed");
  return issues;
}

/** The first operation of a trip, as the creator sends it: the server gives the trip its `tripId` and token (SPEC.md §6.2). */
export function buildTripCreation(form: NewTripForm, deviceId: string): { operation: Operation } {
  const participants = form.people.map((name) => ({ id: crypto.randomUUID(), name: name.trim() }));
  const creator = participants[0]!;
  const operation = buildOperation(
    { by: creator.id, device: deviceId },
    {
      type: "TripCreated",
      name: form.name.trim(),
      currency: form.currency,
      participants,
      from: form.from || null,
      to: form.to || null,
      defaultSplit:
        form.defaultMethod === "shares"
          ? { method: "shares", shares: Object.fromEntries(participants.map((p, i) => [p.id, form.shares[i] ?? 1])) }
          : { method: "equal" },
    },
  );
  return { operation };
}

import type { Payer } from "./expense.ts";
import type { ExpenseSnapshot } from "./expense.ts";
import type { ParticipantId } from "./ids.ts";
import type { DefaultSplit, Split } from "./split.ts";
import type { Trip } from "./trip.ts";

/** Recomputes who is in the trip and who was merged into whom, from the roster and the merges that stand. */
export function refreshParticipants(trip: Trip): void {
  const edges = new Map<ParticipantId, ParticipantId>();
  for (const m of trip.merges) if (!m.undone) edges.set(m.fromParticipantId, m.intoParticipantId);
  const mergedInto: Record<ParticipantId, ParticipantId> = {};
  for (const from of edges.keys()) {
    let target = edges.get(from)!;
    for (let next = edges.get(target); next !== undefined; next = edges.get(target)) target = next;
    mergedInto[from] = target;
  }
  trip.mergedInto = mergedInto;
  trip.participants = trip.roster
    .filter((r) => !r.removed && mergedInto[r.id] === undefined)
    .map(({ id, name }) => ({ id, name }));
}

/** The participant an id stands for once merges are applied. */
export const resolveParticipant = (trip: Trip, id: ParticipantId): ParticipantId => trip.mergedInto[id] ?? id;

function sumInto<T extends Record<string, number>>(trip: Trip, record: T, round = (n: number) => n): T {
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(record)) {
    const target = resolveParticipant(trip, id);
    out[target] = round((out[target] ?? 0) + value);
  }
  return out as T;
}

const hundredths = (n: number) => Math.round(n * 100) / 100;

/** A split with every reference to a merged participant moved to the survivor (SPEC.md §3.3). */
export function mergeSplit(trip: Trip, split: Split): Split {
  switch (split.method) {
    case "equal":
      return { method: "equal", among: [...new Set(split.among.map((id) => resolveParticipant(trip, id)))] };
    case "exact":
      return { method: "exact", amounts: sumInto(trip, split.amounts) };
    case "percentage":
      return { method: "percentage", percentages: sumInto(trip, split.percentages, hundredths) };
    case "shares":
      return { method: "shares", shares: sumInto(trip, split.shares) };
  }
}

export function mergeDefaultSplit(trip: Trip, split: DefaultSplit): DefaultSplit {
  return split.method === "equal" ? split : { method: "shares", shares: sumInto(trip, split.shares) };
}

/** The payers and split of an expense as the fold sees them, after merges. */
export function effectiveExpense(trip: Trip, snapshot: ExpenseSnapshot): { payers: Payer[]; split: Split } {
  const paid = new Map<ParticipantId, number>();
  for (const p of snapshot.payers) {
    const id = resolveParticipant(trip, p.participantId);
    paid.set(id, (paid.get(id) ?? 0) + p.amount);
  }
  return {
    payers: [...paid].map(([participantId, amount]) => ({ participantId, amount })),
    split: mergeSplit(trip, snapshot.split),
  };
}

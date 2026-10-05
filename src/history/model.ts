import { upcastOperation } from "../../domain";
import type { IgnoredReason, Operation, StoredOperation, Trip } from "../../domain";

export type HistoryAction =
  | { kind: "restore-expense"; expenseId: string }
  | { kind: "restore-settlement"; settlementId: string }
  | { kind: "undo-merge"; mergeOpId: string };

export interface HistoryItem {
  id: string;
  op: Operation;
  by: string;
  at: string;
  /** Null for an operation the server refused: it never got a place in the log. */
  seq: number | null;
  pending: boolean;
  /** Sequenced while the trip was closed: "aggiunta a viaggio chiuso" (SPEC.md §3.15). */
  afterClose: boolean;
  ignored: IgnoredReason | null;
  /** "Non inviata": refused by the server, on this device only. */
  rejected: { reason: string; detail: string } | null;
  /** An edit made without knowing the others on the same expense, or one it overwrote. */
  conflict: boolean;
  /** The name a renamed participant had before. */
  previousName: string | null;
  action: HistoryAction | null;
}

interface Refused {
  operation: StoredOperation;
  reason: string;
  detail: string;
}

/** Ids of the edits of an expense that were made without knowing about each other, and the ones they overwrote. */
function conflictingEdits(trip: Trip): Set<string> {
  const flagged = new Set<string>();
  for (const expense of trip.expenses) {
    expense.versions.forEach((version, i) => {
      if (version.kind !== "edited") return;
      const unseen = expense.versions.slice(expense.versions.findIndex((v) => v.opId === version.baseOpId) + 1, i).filter((v) => v.kind === "edited");
      if (unseen.length === 0) return;
      flagged.add(version.opId);
      for (const v of unseen) flagged.add(v.opId);
    });
  }
  return flagged;
}

/** The latest delete of each expense or settlement that is still deleted: the one that carries "Ripristina". */
function restorableDeletes(trip: Trip, ops: Map<string, Operation>): Map<string, HistoryAction> {
  const latest = new Map<string, string>();
  for (const entry of trip.history) {
    const op = ops.get(entry.opId);
    if (op?.type === "ExpenseDeleted") latest.set(`e:${op.expenseId}`, op.id);
    if (op?.type === "SettlementDeleted") latest.set(`s:${op.settlementId}`, op.id);
  }
  const actions = new Map<string, HistoryAction>();
  for (const [key, opId] of latest) {
    const id = key.slice(2);
    if (key.startsWith("e:") && trip.expenses.find((e) => e.id === id)?.deleted) actions.set(opId, { kind: "restore-expense", expenseId: id });
    if (key.startsWith("s:") && trip.settlements.find((s) => s.id === id)?.deleted) actions.set(opId, { kind: "restore-settlement", settlementId: id });
  }
  for (const merge of trip.merges) if (!merge.undone) actions.set(merge.opId, { kind: "undo-merge", mergeOpId: merge.opId });
  return actions;
}

/** The names participants had before each rename, found by walking the log in order. */
function previousNames(trip: Trip, ops: Map<string, Operation>): Map<string, string> {
  const names = new Map<string, string>();
  const before = new Map<string, string>();
  for (const entry of trip.history) {
    const op = ops.get(entry.opId);
    if (!op) continue;
    if (op.type === "TripCreated") op.participants.forEach((p) => names.set(p.id, p.name));
    if (op.type === "ParticipantAdded") names.set(op.participantId, op.name);
    if (op.type === "ParticipantRenamed") {
      before.set(op.id, names.get(op.participantId) ?? "");
      names.set(op.participantId, op.name);
    }
  }
  return before;
}

/**
 * The history, newest first (SPEC.md §3.15): every operation of the folded log, then the ones this device
 * made that the server refused, placed by time. Pure; the screen only words it.
 */
export function historyItems(trip: Trip, operations: Operation[], rejected: Refused[]): HistoryItem[] {
  const ops = new Map(operations.map((o) => [o.id, o]));
  const actions = restorableDeletes(trip, ops);
  const conflicts = conflictingEdits(trip);
  const renamedFrom = previousNames(trip, ops);

  const applied: HistoryItem[] = [];
  for (const entry of trip.history) {
    const op = ops.get(entry.opId);
    if (!op) continue;
    applied.push({
      id: entry.opId,
      op,
      by: entry.by,
      at: entry.at,
      seq: entry.seq,
      pending: entry.pending,
      afterClose: entry.afterClose,
      ignored: entry.ignored,
      rejected: null,
      conflict: conflicts.has(entry.opId),
      previousName: renamedFrom.get(entry.opId) ?? null,
      action: actions.get(entry.opId) ?? null,
    });
  }
  const list = applied.reverse();

  for (const refused of rejected) {
    let op: Operation;
    try {
      op = upcastOperation(refused.operation);
    } catch {
      continue;
    }
    const item: HistoryItem = {
      id: op.id,
      op,
      by: op.by,
      at: op.at,
      seq: null,
      pending: false,
      afterClose: false,
      ignored: null,
      rejected: { reason: refused.reason, detail: refused.detail },
      conflict: false,
      previousName: null,
      action: null,
    };
    const at = list.findIndex((i) => i.at <= item.at);
    list.splice(at === -1 ? list.length : at, 0, item);
  }
  return list;
}

import type { Conflict, ExpenseRecord } from "../trip.ts";

/**
 * The conflict an edit leaves on its expense (SPEC.md §3.14). An edit based on the latest version
 * saw everything: no conflict, and any earlier one is settled. Otherwise it was made without
 * knowledge of the edits sequenced after its base; it wins whole (it is sequenced last) and they lose.
 */
export function conflictAfter(record: ExpenseRecord, edit: { opId: string; baseOpId: string }): Conflict | null {
  const baseIndex = record.versions.findIndex((v) => v.opId === edit.baseOpId);
  const unseen = record.versions
    .slice(baseIndex + 1)
    .filter((v) => v.kind === "edited")
    .map((v) => v.opId);
  return unseen.length === 0 ? null : { baseOpId: edit.baseOpId, winnerOpId: edit.opId, loserOpIds: unseen };
}

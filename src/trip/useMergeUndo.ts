import { useCallback } from "react";
import { useTrip } from "./TripContext";

/**
 * The entry point the history uses to undo a merge (SPEC.md §3.3): writes `MergeUndone` for the merge's
 * operation id, and the fold skips that merge. `merges` are the ones that stand, newest last.
 */
export function useMergeUndo() {
  const { trip, record } = useTrip();
  const undo = useCallback((mergeOpId: string) => record({ type: "MergeUndone", mergeOpId }), [record]);
  return { merges: trip.merges.filter((m) => !m.undone), undo };
}

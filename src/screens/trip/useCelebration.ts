import { useEffect, useRef, useState } from "react";
import type { Trip } from "../../../domain";
import { celebrationDue, evenState } from "../../trip";
import type { EvenState } from "../../trip";

/** True for one celebration each time a payment made here brings the trip to "everyone is even" (SPEC.md §7.9). */
export function useCelebration(trip: Trip) {
  const [celebrating, setCelebrating] = useState(false);
  const before = useRef<EvenState | null>(null);
  useEffect(() => {
    const now = evenState(trip);
    if (celebrationDue(before.current, now)) setCelebrating(true);
    before.current = now;
  }, [trip]);
  return { celebrating, done: () => setCelebrating(false) };
}

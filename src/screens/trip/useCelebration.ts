import { useEffect, useRef, useState } from "react";
import { celebrationDue } from "../../history";
import type { EvenState } from "../../history";

/** True for one celebration each time a payment brings the trip from "someone owes" to "everyone is even" (SPEC.md §7.9). */
export function useCelebration(now: EvenState) {
  const [celebrating, setCelebrating] = useState(false);
  const before = useRef<EvenState | null>(null);
  const { allEven, settlements } = now;
  useEffect(() => {
    const current = { allEven, settlements };
    if (celebrationDue(before.current, current)) setCelebrating(true);
    before.current = current;
  }, [allEven, settlements]);
  return { celebrating, done: () => setCelebrating(false) };
}

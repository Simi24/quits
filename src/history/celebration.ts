/** What the trip looked like at one moment: whether everyone is even, and how many payments stand. */
export interface EvenState {
  allEven: boolean;
  settlements: number;
}

/**
 * The PARI celebration is due once, when a payment brings everyone to zero (SPEC.md §7.6 item 10, §7.9):
 * the step from "someone is not even" to "everyone is even" with one more payment standing. `before` is null
 * for the state the trip opened in: opening an even trip is not a win, and neither is deleting the only expense.
 */
export const celebrationDue = (before: EvenState | null, now: EvenState): boolean =>
  before !== null && !before.allEven && now.allEven && now.settlements > before.settlements;

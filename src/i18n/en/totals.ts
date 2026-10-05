import type { Dictionary } from "../dictionary";

export const totals: Dictionary["totals"] = {
  viewLabel: "View",
  balances: "Balances",
  totals: "Totals",
  tripTotal: "Trip total",
  perDay: (c, days) => `${c} a day, over ${days === 1 ? "1 day" : `${days} days`}`,
  perHead: (c) => `${c} per head per day`,
  preTrip: (c) => `${c} was spent before the trip: it counts in the total, not in the daily averages.`,
  paidVsDue: "Paid and owed",
  paid: "paid",
  due: "owed",
  byCategory: "By category",
};

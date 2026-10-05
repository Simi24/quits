import type { Dictionary } from "../dictionary";

export const onboarding: Dictionary["onboarding"] = {
  howTitle: "How it works",
  howSteps: [
    { title: "Create the trip", text: "A name, a currency and who is coming along." },
    { title: "Send the link", text: "Whoever opens it joins the trip, no sign-up." },
    { title: "Record the expenses", text: "Everyone adds what they pay. In the end Quits says who owes what to whom." },
  ],
  tip: "Tap + to record an expense: pick who paid and how to split it.",
  tipClose: "Close the tip",
  emptyRollClosed: "This trip closed with no expenses.",
  emptyRollClosedHelp: "Receipts show up here, one day at a time. To add some, reopen the trip.",
  emptyBalances: "No balances yet.",
  emptyBalancesHelp: "Here you'll see who is owed and who owes, and the few payments that bring everyone even. They appear with the first expense, which you record from the Expenses tab.",
  emptyTotals: "Nothing to add up yet.",
  emptyTotalsHelp: "The trip total, the days and the categories fill in with the expenses. Start from the Expenses tab.",
  emptyCharts: "No charts yet.",
  emptyChartsHelp: "Here you'll find eight charts: how spending grows, the categories, the days, who paid the most and how balances change. They draw themselves from the expenses: start from the Expenses tab.",
};

export const totals = {
  viewLabel: "Vista",
  balances: "Saldi",
  totals: "Totali",
  tripTotal: "Totale del viaggio",
  perDay: (c: string, days: number) => `${c} al giorno, in ${days === 1 ? "1 giorno" : `${days} giorni`}`,
  perHead: (c: string) => `${c} a testa al giorno`,
  preTrip: (c: string) => `${c} sono prima della partenza: contano nel totale, non nelle medie al giorno.`,
  paidVsDue: "Pagato e spettante",
  paid: "pagato",
  due: "spettante",
  byCategory: "Per categoria",
};

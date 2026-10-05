// Test fixture: the prototype's "Sardegna 2026" trip (docs/prototype/flussi.html, grafici.html) as operations.
import type { ExpenseSnapshot, Operation } from "./index.ts";
import { op } from "./testing.ts";

const DEFAULT_SHARES = { p1: 1, p2: 1, p3: 2, p4: 1, p5: 1 };
const ALL = ["p1", "p2", "p3", "p4", "p5"];
const defaultSplit = { method: "shares", shares: DEFAULT_SHARES } as const;

type Row = {
  id: string;
  date: string;
  time: string;
  description: string;
  categoryId: string;
  amount: number;
  payers: [string, number][];
  split?: ExpenseSnapshot["split"];
};

const rows: Row[] = [
  { id: "e1", date: "2026-06-13", time: "07:40", description: "Traghetto Livorno-Olbia", categoryId: "transport", amount: 48600, payers: [["p1", 48600]] },
  { id: "e2", date: "2026-06-13", time: "16:05", description: "Casa a Cala Gonone, 7 notti", categoryId: "accommodation", amount: 154000, payers: [["p3", 100000], ["p2", 54000]] },
  { id: "e3", date: "2026-06-13", time: "16:10", description: "Caparra della casa", categoryId: "accommodation", amount: 30000, payers: [["p4", 30000]] },
  { id: "e4", date: "2026-06-13", time: "19:22", description: "Spesa al Conad", categoryId: "groceries", amount: 8743, payers: [["p5", 8743]] },
  { id: "e5", date: "2026-06-14", time: "09:30", description: "Noleggio auto, 7 giorni", categoryId: "transport", amount: 39200, payers: [["p1", 39200]] },
  { id: "e6", date: "2026-06-14", time: "22:48", description: "Cena a Su Gologone", categoryId: "restaurants", amount: 31250, payers: [["p2", 31250]] },
  { id: "e7", date: "2026-06-15", time: "10:15", description: "Gommone per Cala Luna", categoryId: "activities", amount: 26000, payers: [["p4", 26000]], split: { method: "shares", shares: { p1: 1, p2: 1, p3: 2, p4: 1 } } },
  { id: "e23", date: "2026-06-15", time: "11:02", description: "Ombrellone e lettini", categoryId: "activities", amount: 4000, payers: [["p4", 4000]] },
  { id: "e9", date: "2026-06-15", time: "13:30", description: "Pranzo al chiosco", categoryId: "restaurants", amount: 9640, payers: [["p3", 9640]], split: { method: "exact", amounts: { p1: 1820, p2: 1500, p3: 3370, p4: 1650, p5: 1300 } } },
  { id: "e8", date: "2026-06-15", time: "16:40", description: "Gelati", categoryId: "restaurants", amount: 1350, payers: [["p5", 1350]], split: { method: "equal", among: ["p2", "p4", "p5"] } },
  { id: "e10", date: "2026-06-16", time: "08:15", description: "Escursione a Gorropu", categoryId: "activities", amount: 15000, payers: [["p5", 15000]] },
  { id: "e11", date: "2026-06-16", time: "18:10", description: "Spesa al mercato", categoryId: "groceries", amount: 6418, payers: [["p2", 6418]] },
  { id: "e12", date: "2026-06-16", time: "19:00", description: "Benzina", categoryId: "transport", amount: 7000, payers: [["p4", 7000]] },
  { id: "e13", date: "2026-06-17", time: "19:45", description: "Aperitivo al tramonto", categoryId: "c-aperitivi", amount: 5800, payers: [["p1", 5800]], split: { method: "equal", among: ["p1", "p2", "p4", "p5"] } },
  { id: "e14", date: "2026-06-17", time: "22:30", description: "Cena di pesce", categoryId: "restaurants", amount: 24000, payers: [["p2", 24000]], split: { method: "percentage", percentages: { p1: 15, p2: 15, p3: 35, p4: 20, p5: 15 } } },
  { id: "e15", date: "2026-06-18", time: "10:05", description: "Parcheggio a Cala Fuili", categoryId: "transport", amount: 2400, payers: [["p5", 2400]] },
  { id: "e17", date: "2026-06-18", time: "11:30", description: "Kayak alle grotte", categoryId: "activities", amount: 9000, payers: [["p2", 9000]], split: { method: "equal", among: ["p1", "p2", "p4"] } },
  { id: "e16", date: "2026-06-18", time: "17:20", description: "Spesa per la grigliata", categoryId: "groceries", amount: 4107, payers: [["p4", 4107]] },
  { id: "e18", date: "2026-06-19", time: "12:10", description: "Pesce dal mercato", categoryId: "groceries", amount: 7360, payers: [["p3", 7360]] },
  { id: "e19", date: "2026-06-19", time: "18:30", description: "Mirto per la padrona di casa", categoryId: "other", amount: 1890, payers: [["p1", 1890]], split: { method: "equal", among: ALL } },
  { id: "e20", date: "2026-06-20", time: "09:00", description: "Caparra restituita", categoryId: "accommodation", amount: -30000, payers: [["p4", -30000]] },
  { id: "e21", date: "2026-06-20", time: "10:30", description: "Traghetto Olbia-Livorno", categoryId: "transport", amount: 48600, payers: [["p3", 48600]] },
  { id: "e22", date: "2026-06-20", time: "13:15", description: "Pranzo all'imbarco", categoryId: "restaurants", amount: 5430, payers: [["p2", 5430]] },
];

const snapshot = (r: Row): ExpenseSnapshot => ({
  description: r.description,
  amount: r.amount,
  date: r.date,
  categoryId: r.categoryId,
  payers: r.payers.map(([participantId, amount]) => ({ participantId, amount })),
  split: r.split ?? { method: "shares", shares: DEFAULT_SHARES },
});

const at = (iso: string) => `${iso}:00Z`;

/** The trip as the prototype's operations tell it, in the order the server sequenced them. */
export function sardegnaOperations(): Operation[] {
  const created = op(
    {
      type: "TripCreated",
      name: "Sardegna 2026",
      currency: "EUR",
      participants: [
        { id: "p1", name: "Simone" },
        { id: "p2", name: "Sara" },
        { id: "p3", name: "Giulia e Marco" },
        { id: "p4", name: "Luca" },
        { id: "p5", name: "Chiara" },
      ],
      from: "2026-06-13",
      to: "2026-06-20",
      defaultSplit,
    },
    { id: "create-trip", at: at("2026-06-01T21:10") },
  );
  const category = op(
    { type: "CategoryAdded", categoryId: "c-aperitivi", name: "Aperitivi", emoji: "🍹" },
    { id: "add-aperitivi", by: "p2", at: at("2026-06-02T08:00") },
  );
  const creations = rows.map((r) =>
    op({ type: "ExpenseCreated", expenseId: r.id, expense: snapshot(r) }, { id: `create-${r.id}`, by: r.payers[0]![0], at: at(`${r.date}T${r.time}`) }),
  );
  const row = (id: string) => rows.find((r) => r.id === id)!;
  const edit = (opId: string, expenseId: string, by: string, time: string, base: string, change: Partial<ExpenseSnapshot>) =>
    op({ type: "ExpenseEdited", expenseId, baseOpId: base, expense: { ...snapshot(row(expenseId)), ...change } }, { id: opId, by, at: at(time) });
  // e4: a real conflict. Simone (offline) and Luca edited it from the same version; Luca's reached the server last.
  const e4Mine = edit("e4-mine", "e4", "p1", "2026-06-14T09:10", "create-e4", {
    description: "Spesa al Conad e crema solare",
    amount: 9643,
    payers: [{ participantId: "p5", amount: 9643 }],
  });
  const e4Theirs = edit("e4-theirs", "e4", "p4", "2026-06-14T09:14", "create-e4", {
    payers: [{ participantId: "p5", amount: 6000 }, { participantId: "p4", amount: 2743 }],
  });
  // e14: Sara fixed the amount after the bill came.
  const e14Fix = edit("e14-fix", "e14", "p2", "2026-06-17T23:05", "create-e14", {
    amount: 24730,
    payers: [{ participantId: "p2", amount: 24730 }],
  });
  const e23Deleted = op({ type: "ExpenseDeleted", expenseId: "e23" }, { id: "delete-e23", by: "p4", at: at("2026-06-15T18:20") });
  const s1 = op(
    { type: "SettlementRecorded", settlementId: "s1", fromParticipantId: "p4", toParticipantId: "p1", amount: 10000, date: "2026-06-18" },
    { id: "record-s1", by: "p4", at: at("2026-06-18T20:00") },
  );
  const s2 = op(
    { type: "SettlementRecorded", settlementId: "s2", fromParticipantId: "p5", toParticipantId: "p3", amount: 8000, date: "2026-06-19" },
    { id: "record-s2", by: "p5", at: at("2026-06-19T21:00") },
  );
  // The server sequenced everything in the order it happened.
  const rest = [...creations, e4Mine, e4Theirs, e14Fix, e23Deleted, s1, s2].sort((a, b) => a.at.localeCompare(b.at));
  return [created, category, ...rest];
}

import { describe, expect, it } from "vitest";
import { foldWithPending } from "../../domain";
import { op, expense, expenseCreated, tripCreated } from "../../domain/testing";
import { buildExpensesCsv } from "./csv";

const HEADER = "date,description,category,type,amount,currency,split,paid Simone,paid Sara,paid Luca,share Simone,share Sara,share Luca";
const csvOf = (ops: ReturnType<typeof op>[], lang: "it" | "en" = "it") => buildExpensesCsv(foldWithPending([], [tripCreated(), ...ops]), lang);
const lines = (csv: string) => csv.split("\r\n");

describe("buildExpensesCsv", () => {
  it("writes one row per expense: amounts in major units with a dot, who paid and each share", () => {
    const csv = csvOf([expenseCreated("e1")]);
    expect(lines(csv)).toEqual([HEADER, "2026-06-14,Cena,Ristoranti,expense,90.00,EUR,equal,90.00,0.00,0.00,30.00,30.00,30.00", ""]);
  });

  it("names the category in the interface language", () => {
    expect(lines(csvOf([expenseCreated("e1")], "en"))[1]).toContain(",Restaurants,");
  });

  it("quotes commas, quotes and line breaks", () => {
    const csv = csvOf([expenseCreated("e1", expense({ description: 'Pizza, "da Gigi"\nbis' }))]);
    expect(csv).toContain('"Pizza, ""da Gigi""\nbis"');
  });

  it("marks a refund and writes it negative", () => {
    const refund = expense({ description: "Caparra restituita", amount: -3000, payers: [{ participantId: "p1", amount: -3000 }] });
    expect(lines(csvOf([expenseCreated("e1", refund)]))[1]).toBe("2026-06-14,Caparra restituita,Ristoranti,refund,-30.00,EUR,equal,-30.00,0.00,0.00,-10.00,-10.00,-10.00");
  });

  it("leaves out deleted expenses", () => {
    const csv = csvOf([expenseCreated("e1"), op({ type: "ExpenseDeleted", expenseId: "e1" })]);
    expect(lines(csv)).toEqual([HEADER, ""]);
  });

  it("keeps a spreadsheet from running a description as a formula", () => {
    const csv = csvOf([expenseCreated("e1", expense({ description: "=HYPERLINK(1)" }))]);
    expect(lines(csv)[1]).toMatch(/^2026-06-14,'=HYPERLINK\(1\),/);
  });

  it("follows the currency's minor unit", () => {
    const ops = [expenseCreated("e1", expense({ amount: 9000, payers: [{ participantId: "p1", amount: 9000 }] }))];
    const yen = buildExpensesCsv(foldWithPending([], [tripCreated({ currency: "JPY" }), ...ops]), "it");
    expect(lines(yen)[1]).toContain(",9000,JPY,equal,9000,0,0,3000,3000,3000");
  });

  it("orders by date, then by order of entry", () => {
    const later = expenseCreated("e1", expense({ description: "Dopo", date: "2026-06-15" }));
    const earlier = expenseCreated("e2", expense({ description: "Prima", date: "2026-06-14" }));
    expect(lines(csvOf([later, earlier])).slice(1, 3).map((l) => l.split(",")[1])).toEqual(["Prima", "Dopo"]);
  });
});

import { describe, expect, it } from "vitest";
import { balances, tripTotals } from "../index.ts";
import { chartModel } from "./model.ts";
import { sardegnaUntil, tripWith } from "./testing.ts";

// Expected numbers come from running the prototype's own code (docs/prototype/grafici.html, model() and bankModel()) on its seed.
const OVER = "2026-06-21";
const sardegna = () => chartModel(sardegnaUntil(), { today: OVER, who: null });

describe("Andamento", () => {
  it("totals 4565,18 €, 570,65 € a day and 95,11 € per person per day, as the Totali do", () => {
    const { progress } = sardegna();
    expect(progress).toMatchObject({ total: 456518, perDay: 57065, perPersonPerDay: 9511, projection: null, pace: null });
    expect(progress.dayTotals).toEqual([241343, 70450, 36990, 28418, 30530, 15507, 9250, 24030]);
    expect(progress.cumulative.at(-1)).toBe(456518);
    expect(progress).toMatchObject({ perDay: tripTotals(sardegnaUntil()).perDay, perPersonPerDay: tripTotals(sardegnaUntil()).perPersonPerDay });
  });

  it("names the most expensive day once the trip is over", () => {
    expect(sardegna().progress.peakDay).toEqual({ date: "2026-06-13", amount: 241343 });
  });

  it("projects the end total at the pace of the last 3 days", () => {
    // Today is day 4 (16 June): total so far 3772,01 €, pace (70450 + 36990 + 28418) / 3.
    const { progress, timeline } = chartModel(sardegnaUntil("2026-06-16"), { today: "2026-06-16", who: null });
    expect(timeline.phase).toBe("running");
    expect(progress.total).toBe(377201);
    expect(progress.pace).toBe(45286);
    expect(progress.projection).toBe(558345);
  });

  it("uses the days there are while fewer than 3 have passed", () => {
    const { progress } = chartModel(sardegnaUntil("2026-06-13"), { today: "2026-06-13", who: null });
    expect(progress).toMatchObject({ total: 241343, pace: 241343, projection: 1930744 });
  });

  it("never projects an undated trip", () => {
    const trip = tripWith({ from: null, to: null }, [
      { id: "a", date: "2026-07-02", amount: 3000 },
      { id: "b", date: "2026-07-03", amount: 3000 },
    ]);
    const { progress, timeline } = chartModel(trip, { today: "2026-07-03", who: null });
    expect(timeline).toMatchObject({ phase: "undated", todayIndex: null });
    expect(progress.projection).toBeNull();
    expect(progress.perDay).toBe(3000);
  });

  it("keeps a booking dated before the start in the total and out of the per-day averages", () => {
    const trip = tripWith({ from: "2026-07-01", to: "2026-07-02" }, [
      { id: "booking", date: "2026-05-20", amount: 50000 },
      { id: "dinner", date: "2026-07-01", amount: 3000 },
      { id: "lunch", date: "2026-07-02", amount: 1000 },
    ]);
    const { progress, days } = chartModel(trip, { today: "2026-07-10", who: null });
    expect(progress.total).toBe(54000);
    expect(progress.preTrip).toBe(50000);
    expect(progress.perDay).toBe(2000);
    expect(days.buckets.map((b) => [b.date, b.total])).toEqual([[null, 50000], ["2026-07-01", 3000], ["2026-07-02", 1000]]);
    expect(days.buckets[0]).toMatchObject({ pre: true });
    expect(progress.cumulative).toEqual([53000, 54000]);
  });

  it("before the trip starts shows what exists and says when it begins", () => {
    const trip = tripWith({ from: "2026-07-01", to: "2026-07-03" }, [{ id: "booking", date: "2026-05-20", amount: 50000 }]);
    const { progress, timeline } = chartModel(trip, { today: "2026-06-01", who: null });
    expect(timeline).toMatchObject({ phase: "before", startsOn: "2026-07-01" });
    expect(progress).toMatchObject({ total: 50000, projection: null, solid: 0 });
  });

  it("has an empty model for a trip without expenses", () => {
    const { progress, categories, ranking, bank } = chartModel(tripWith({ from: null, to: null }, []), { today: null, who: null });
    expect(progress).toMatchObject({ total: 0, perDay: 0, perPersonPerDay: 0, projection: null });
    expect(categories).toEqual([]);
    expect(ranking).toEqual([]);
    expect(bank.peak).toBeNull();
  });
});

describe("Per categoria", () => {
  it("sorts by amount and carries the count, the refunds netted and the biggest expense", () => {
    const rows = sardegna().categories;
    expect(rows.map((r) => [r.categoryId, r.amount])).toEqual([
      ["accommodation", 154000],
      ["transport", 145800],
      ["restaurants", 72400],
      ["activities", 50000],
      ["groceries", 26628],
      ["c-aperitivi", 5800],
      ["other", 1890],
    ]);
    const lodging = rows[0]!;
    expect(lodging).toMatchObject({ count: 2, refunds: -30000, biggest: { description: "Casa a Cala Gonone, 7 notti", amount: 154000 } });
    expect(rows.reduce((sum, r) => sum + r.amount, 0)).toBe(456518);
  });

  it("gives each category its per-person-per-day average, bookings left out", () => {
    const transport = sardegna().categories.find((r) => r.categoryId === "transport")!;
    expect(transport.perPersonPerDay).toBe(Math.round(145800 / 8 / 6));
  });
});

describe("Per giorno", () => {
  it("stacks by category in the fixed order and keeps the refund below zero", () => {
    const { days } = sardegna();
    expect(days.order.slice(0, 7)).toEqual(["groceries", "accommodation", "restaurants", "activities", "transport", "other", "c-aperitivi"]);
    const last = days.buckets.at(-1)!;
    expect(last.date).toBe("2026-06-20");
    expect(last.byCategory.accommodation).toBe(-30000);
    expect(days.peak).toBe(0);
  });
});

describe("Le spese più grandi", () => {
  it("ranks by amount, refunds excluded, at most 10", () => {
    const { ranking } = sardegna();
    expect(ranking).toHaveLength(10);
    expect(ranking.slice(0, 3).map((r) => [r.description, r.amount])).toEqual([
      ["Casa a Cala Gonone, 7 notti", 154000],
      ["Traghetto Livorno-Olbia", 48600],
      ["Traghetto Olbia-Livorno", 48600],
    ]);
    expect(ranking.every((r) => r.amount > 0)).toBe(true);
  });
});

describe("Pagato e spettante", () => {
  it("is what each one paid and was due over the expenses, settlements left out", () => {
    const rows = sardegna().paidDue;
    expect(rows.map((r) => [r.participantId, r.paid, r.due, r.difference])).toEqual([
      ["p1", 95490, 78579, 16911],
      ["p2", 130828, 78707, 52121],
      ["p3", 165600, 148839, 16761],
      ["p4", 39850, 80092, -40242],
      ["p5", 24750, 70301, -45551],
    ]);
  });
});

describe("Persona per categoria", () => {
  it("shares each category among people, with a totals row equal to each person's due", () => {
    const { matrix, paidDue } = sardegna();
    expect(matrix.categoryIds).toHaveLength(7);
    for (const row of paidDue) {
      const column = matrix.categoryIds.reduce((sum, c) => sum + matrix.cells[c]![row.participantId]!, 0);
      expect(column).toBe(row.due);
      expect(matrix.totals[row.participantId]).toBe(row.due);
    }
    expect(matrix.best).toEqual({ categoryId: "accommodation", participantId: "p3", amount: 51333 });
  });
});

describe("Chi ha fatto da banca", () => {
  it("ends exactly on the balances of Saldi, settlements included", () => {
    const trip = sardegnaUntil();
    const { bank } = chartModel(trip, { today: OVER, who: null });
    expect(bank.steps.at(-1)!.balances).toEqual(balances(trip));
    expect(bank.steps.at(-1)!.balances).toEqual({ p1: 6911, p2: 52121, p3: 8761, p4: -30242, p5: -37551 });
  });

  it("starts at zero and has one step per expense or settlement", () => {
    const { bank } = sardegna();
    expect(bank.steps[0]).toMatchObject({ t: 0, event: null });
    expect(Object.values(bank.steps[0]!.balances).every((v) => v === 0)).toBe(true);
    expect(bank.steps).toHaveLength(25);
    expect(bank.steps.filter((s) => s.event?.kind === "settlement")).toHaveLength(2);
  });

  it("names the peak and who was the bank for most days", () => {
    const { bank } = sardegna();
    expect(bank.peak).toMatchObject({ amount: 55696, participantId: "p2" });
    expect(bank.bankId).toBe("p2");
    expect(bank.bankDays).toBe(4);
    expect(bank.lo).toBe(-47264);
    expect(bank.hi).toBe(55696);
  });

  it("keeps steps in time order, inside the trip's days", () => {
    const { bank, timeline } = sardegna();
    const times = bank.steps.map((s) => s.t);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times.at(-1)!).toBeLessThanOrEqual(timeline.dates.length);
  });
});

describe("Di chi", () => {
  it("shows a person's share where the group charts show amounts: Giulia e Marco's 1488,39 €", () => {
    const m = chartModel(sardegnaUntil(), { today: OVER, who: "p3" });
    expect(m.progress.total).toBe(148839);
    expect(m.progress.dayTotals).toEqual([80448, 23484, 13770, 9472, 8655, 2169, 2831, 8010]);
    expect(m.heads).toBe(2);
    expect(m.categories.map((r) => [r.categoryId, r.amount])).toEqual([
      ["accommodation", 51333],
      ["transport", 48600],
      ["restaurants", 24252],
      ["activities", 15400],
      ["groceries", 8876],
      ["other", 378],
    ]);
  });

  it("ranks by the person's share, and an expense they are not in drops out", () => {
    const m = chartModel(sardegnaUntil(), { today: OVER, who: "p3" });
    expect(m.ranking.every((r) => r.amount > 0)).toBe(true);
    expect(m.ranking.map((r) => r.description)).not.toContain("Gelati");
    expect(m.ranking[0]).toMatchObject({ description: "Casa a Cala Gonone, 7 notti", amount: 51333, fullAmount: 154000 });
  });

  it("uses the group's heads when nobody is chosen: the couple counts 2", () => {
    expect(sardegna().heads).toBe(6);
  });

  it("falls back to the whole group for someone who is not in the trip", () => {
    expect(chartModel(sardegnaUntil(), { today: OVER, who: "ghost" }).who).toBeNull();
  });

  it("keeps the comparison charts whole: paid and due, the matrix and the bank still list everybody", () => {
    const m = chartModel(sardegnaUntil(), { today: OVER, who: "p3" });
    expect(m.paidDue).toHaveLength(5);
    expect(Object.keys(m.matrix.totals)).toHaveLength(5);
    expect(m.bank.steps.at(-1)!.balances).toHaveProperty("p1");
  });
});

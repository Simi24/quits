import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { expense, expenseCreated, op, tripCreated } from "../domain/testing.ts";
import { seedRejected, seedTrip } from "./seed-trip.ts";
import { applyTheme, THEMES } from "./themes.ts";
import { addExpense, sheet, tab } from "./trip-flow.ts";

// SPEC.md §15 S6, part B: the history overlay, versions, conflict banner, closed trip, motion.

const dinner = () => [tripCreated(), expenseCreated("e1", expense({ description: "Cena", amount: 9000 }))];

const openHistory = async (page: Page) => {
  await tab(page, "Spese").click();
  await page.getByRole("button", { name: "Cronologia" }).click();
  await expect(page.getByRole("dialog", { name: "Cronologia" })).toBeVisible();
};

const hero = (page: Page) => page.getByTestId("balance-hero");

test("restoring a deleted expense and a deleted settlement from the history brings the balances back", async ({ page }) => {
  await seedTrip(page, "Sardegna", dinner());
  await tab(page, "Saldi").click();
  await expect(hero(page)).toHaveText(/Ti devono 60,00/);

  await tab(page, "Spese").click();
  await page.getByTestId("expense-row").click();
  await page.getByRole("button", { name: "Elimina", exact: true }).click();
  await page.getByRole("button", { name: "Sì, elimina" }).click();
  await tab(page, "Saldi").click();
  await expect(hero(page)).toHaveText("Sei pari");

  await openHistory(page);
  const deleted = page.getByTestId("history-row").filter({ hasText: 'ha eliminato "Cena"' });
  await deleted.getByRole("button", { name: "Ripristina" }).click();
  await expect(page.getByText("Spesa ripristinata")).toBeVisible();
  await expect(deleted.getByRole("button", { name: "Ripristina" })).toHaveCount(0);
  await page.getByRole("dialog", { name: "Cronologia" }).getByRole("button", { name: "Indietro" }).click();
  await tab(page, "Saldi").click();
  await expect(hero(page)).toHaveText(/Ti devono 60,00/);

  // A settlement: record one, delete it, restore it from the history.
  await page.getByRole("button", { name: "Registra", exact: true }).first().click();
  await sheet(page, "Registra un pagamento").getByRole("button", { name: "Registra", exact: true }).click();
  await tab(page, "Spese").click();
  await page.getByText("Pagamento", { exact: true }).first().click();
  await page.getByRole("button", { name: "Elimina il pagamento" }).click();
  await openHistory(page);
  await page.getByTestId("history-row").filter({ hasText: "ha eliminato un pagamento" }).getByRole("button", { name: "Ripristina" }).click();
  await expect(page.getByText("Pagamento ripristinato")).toBeVisible();
});

test("undoing a merge from the history restores the previous balances", async ({ page }) => {
  await seedTrip(page, "Sardegna", dinner());
  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "Unisci Luca" }).click();
  const dialog = sheet(page, "Unisci Luca");
  await dialog.getByRole("button", { name: "Sara", exact: true }).click();
  await dialog.getByRole("button", { name: "Unisci Luca in Sara" }).click();
  await tab(page, "Saldi").click();
  await expect(page.getByTestId("balance-row")).toHaveCount(2);
  await expect(page.getByTestId("balance-row").filter({ hasText: "Sara" })).toContainText("deve dare 45,00");

  await openHistory(page);
  await page.getByTestId("history-row").filter({ hasText: "ha unito Luca in Sara" }).getByRole("button", { name: "Annulla unione" }).click();
  await expect(page.getByText("Unione annullata")).toBeVisible();
  await page.getByRole("dialog", { name: "Cronologia" }).getByRole("button", { name: "Indietro" }).click();
  await tab(page, "Saldi").click();
  await expect(page.getByTestId("balance-row")).toHaveCount(3);
  await expect(page.getByTestId("balance-row").filter({ hasText: "Sara" })).toContainText("deve dare 30,00");
  await expect(page.getByTestId("balance-row").filter({ hasText: "Luca" })).toContainText("deve dare 30,00");
});

test("an expense lists its versions and an older one can be put back", async ({ page }) => {
  await seedTrip(page, "Sardegna", dinner());
  await page.getByTestId("expense-row").click();
  await page.getByRole("button", { name: "Modifica", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Modifica spesa" });
  await edit.getByLabel("Importo").fill("120,00");
  await edit.getByRole("button", { name: "Salva le modifiche" }).click();
  await expect(page.getByTestId("detail-amount")).toHaveText("120,00 €");
  const versions = page.getByTestId("version");
  await expect(versions).toHaveCount(2);
  await expect(versions.first()).toContainText("ha cambiato importo");
  await expect(versions.first()).toContainText("Versione attuale");
  await versions.nth(1).getByRole("button", { name: "Ripristina questa versione" }).click();
  await expect(page.getByTestId("detail-amount")).toHaveText("90,00 €");
  await expect(versions).toHaveCount(3);
  await expect(versions.first()).toContainText("ha ripristinato una versione precedente");
});

test("a refused operation shows as non inviata with its reason, on this device", async ({ page }) => {
  const tripId = await seedTrip(page, "Sardegna", dinner());
  await seedRejected(page, tripId, op({ type: "ExpenseDeleted", expenseId: "e1" }, { id: "refused", at: "2026-06-02T10:00:00Z" }), "malformed", "bad");
  await page.reload();
  await openHistory(page);
  const row = page.getByTestId("history-row").filter({ has: page.getByTestId("mark-unsent") });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('ha eliminato "Cena"');
  await expect(row).toContainText("non inviata");
  await expect(row.getByRole("button")).toHaveCount(0);
  // The expense itself is untouched: a refused operation never counts.
  await page.getByRole("dialog", { name: "Cronologia" }).getByRole("button", { name: "Indietro" }).click();
  await expect(page.getByTestId("expense-row")).toHaveCount(1);
});

const lateOps = () => [
  ...dinner(),
  op({ type: "TripClosed" }, { id: "close", at: "2026-06-03T10:00:00Z" }),
  expenseCreated("late", expense({ description: "Gelato", amount: 600 }), { at: "2026-06-03T11:00:00Z" }),
];

test("an operation added to a closed trip is marked in the history", async ({ page }) => {
  await seedTrip(page, "Sardegna", lateOps());
  await openHistory(page);
  const marked = page.getByTestId("history-row").filter({ has: page.getByTestId("mark-after-close") });
  await expect(marked).toHaveCount(1);
  await expect(marked).toContainText('ha aggiunto "Gelato"');
  await expect(marked).toContainText("aggiunta a viaggio chiuso");
});

test("a closed trip disables every edit control", async ({ page }) => {
  const ops = [...dinner(), op({ type: "ExpenseDeleted", expenseId: "e1" }), op({ type: "TripClosed" })];
  await seedTrip(page, "Sardegna", [...ops.slice(0, 1), expenseCreated("e2", expense({ description: "Pizza", amount: 3000 })), ...ops.slice(1)]);
  await expect(page.getByTestId("closed-bar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nuova spesa" })).toHaveCount(0);

  await openHistory(page);
  await expect(page.getByRole("dialog", { name: "Cronologia" }).getByRole("button", { name: "Ripristina" })).toHaveCount(0);
  await page.getByRole("dialog", { name: "Cronologia" }).getByRole("button", { name: "Indietro" }).click();

  await page.getByTestId("expense-row").first().click();
  await expect(page.getByRole("button", { name: "Modifica", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Elimina", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ripristina questa versione" })).toHaveCount(0);
  await page.getByRole("button", { name: "Indietro" }).click();

  await tab(page, "Saldi").click();
  await expect(page.getByRole("button", { name: "Registra", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Registra un altro pagamento" })).toHaveCount(0);

  await tab(page, "Viaggio").click();
  for (const label of ["Nome del viaggio", "Dal", "Valuta del viaggio", "Aggiungi un nome"]) {
    await expect(page.getByLabel(label)).toBeDisabled();
  }
  await expect(page.getByRole("button", { name: "Salva il viaggio" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Unisci Luca" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Rinomina Luca" })).toBeDisabled();
  // Reading and reopening stay available.
  await expect(page.getByRole("button", { name: "CSV delle spese" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Riapri" }).first()).toBeEnabled();
});

const conflictOps = () => [
  ...dinner(),
  expenseCreated("e2", expense({ description: "Pizza", amount: 3000 })),
  op({ type: "ExpenseEdited", expenseId: "e1", baseOpId: "create-e1", expense: expense({ description: "Cena", amount: 10000, payers: [{ participantId: "p1", amount: 10000 }] }) }, { id: "mine", by: "p1" }),
  op({ type: "ExpenseEdited", expenseId: "e1", baseOpId: "create-e1", expense: expense({ description: "Cena", amount: 11000, payers: [{ participantId: "p1", amount: 11000 }] }) }, { id: "theirs", by: "p2" }),
];

test("the conflict banner shows on open, filters the list, and goes away once seen", async ({ page }) => {
  await seedTrip(page, "Sardegna", conflictOps());
  const banner = page.getByTestId("conflict-banner");
  await expect(banner).toContainText("1 spesa modificata in contemporanea");
  await expect(page.getByTestId("expense-row")).toHaveCount(2);
  await banner.getByRole("button", { name: "Mostra" }).click();
  await expect(page.getByTestId("expense-row")).toHaveCount(1);
  await expect(page.getByTestId("expense-row")).toContainText("Cena");

  await page.getByTestId("expense-row").click();
  await page.getByRole("button", { name: "Va bene così" }).click();
  await page.getByRole("button", { name: "Indietro" }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.getByTestId("expense-row")).toHaveCount(2);

  await openHistory(page);
  await expect(page.getByTestId("history-row").filter({ hasText: "insieme a un'altra persona" })).toHaveCount(2);
});

test("PARI lands once when a payment brings everyone to zero, and not on a trip that opens even", async ({ page }) => {
  await seedTrip(page, "Sardegna", dinner());
  await tab(page, "Saldi").click();
  await expect(page.getByTestId("pari-celebration")).toHaveCount(0);
  await page.getByRole("button", { name: "Registra tutti i pagamenti suggeriti" }).click();
  const pari = page.getByRole("dialog", { name: "Tutti pari!" });
  await expect(pari).toBeVisible();
  await expect(pari).toContainText("PARI");
  await expect(pari).toContainText("Nessuno deve più niente a nessuno.");
  await pari.getByRole("button", { name: "Bello" }).click();
  await expect(pari).toHaveCount(0);
  await tab(page, "Spese").click();
  await tab(page, "Saldi").click();
  await expect(pari).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Sardegna" })).toBeVisible();
  await expect(pari).toHaveCount(0);
});

test("only the row just added prints in", async ({ page }) => {
  await seedTrip(page, "Sardegna", dinner());
  await expect(page.locator(".anim-print")).toHaveCount(0);
  await addExpense(page, { description: "Gelati", amount: "12,00" });
  await expect(page.locator(".anim-print")).toHaveCount(1);
  await expect(page.locator(".anim-print")).toContainText("Gelati");
  await tab(page, "Saldi").click();
  await tab(page, "Spese").click();
  await expect(page.locator(".anim-print")).toHaveCount(0);
});

test("the new row prints once: a search that hides and shows it again does not replay it", async ({ page }) => {
  await seedTrip(page, "Sardegna", dinner());
  await addExpense(page, { description: "Gelati", amount: "12,00" });
  const printing = page.locator(".anim-print");
  await expect(printing).toHaveCount(1);
  await expect(printing).toHaveCount(0);
  const search = page.getByPlaceholder("Cerca tra le spese");
  await search.fill("Cena");
  await search.fill("");
  await expect(page.getByTestId("expense-row").filter({ hasText: "Gelati" })).toBeVisible();
  await expect(printing).toHaveCount(0);
});

test("the balance mark closes when a balance reaches zero", async ({ page }) => {
  await seedTrip(page, "Sardegna", dinner());
  await tab(page, "Saldi").click();
  const luca = page.getByTestId("balance-row").filter({ hasText: "Luca" });
  await expect(luca.locator("[data-open]")).toHaveAttribute("data-open", "true");
  await page.getByRole("button", { name: "Registra tutti i pagamenti suggeriti" }).click();
  await page.getByRole("button", { name: "Bello" }).click();
  await expect(luca.locator("[data-open]")).toHaveAttribute("data-open", "false");
});

test("under reduced motion the stamp does not animate", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedTrip(page, "Sardegna", dinner());
  await tab(page, "Saldi").click();
  await page.getByRole("button", { name: "Registra tutti i pagamenti suggeriti" }).click();
  const stamp = page.getByTestId("pari-celebration").getByText("PARI", { exact: true });
  await expect(stamp).toBeVisible();
  const seconds = await stamp.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
  expect(seconds).toBeLessThan(0.001);
});

test("the history and the banner speak English", async ({ page }) => {
  await seedTrip(page, "Sardegna", conflictOps());
  await tab(page, "Viaggio").click();
  await page.getByRole("group", { name: "Lingua" }).getByRole("button", { name: "English" }).click();
  await page.getByRole("navigation", { name: "Quits" }).getByRole("button", { name: "Expenses" }).click();
  await expect(page.getByTestId("conflict-banner")).toContainText("1 expense edited at the same time");
  await page.getByRole("button", { name: "History" }).click();
  const dialog = page.getByRole("dialog", { name: "History" });
  await expect(dialog).toContainText("Every change stays here and is never erased.");
  await expect(dialog).toContainText('created the trip');
  await expect(dialog).toContainText("edited \"Cena\" at the same time as someone else");
});

const AXE_SCREENS: { name: string; open: (page: Page) => Promise<void> }[] = [
  {
    name: "history",
    open: async (page) => {
      await seedTrip(page, "Sardegna", lateOps());
      await openHistory(page);
      await page.waitForTimeout(500);
    },
  },
  {
    name: "history with a refused operation",
    open: async (page) => {
      const tripId = await seedTrip(page, "Sardegna", dinner());
      await seedRejected(page, tripId, op({ type: "ExpenseDeleted", expenseId: "e1" }, { id: "refused", at: "2026-06-02T10:00:00Z" }), "malformed", "bad");
      await page.reload();
      await openHistory(page);
      await page.waitForTimeout(500);
    },
  },
  {
    name: "Spese with the conflict banner",
    open: async (page) => {
      await seedTrip(page, "Sardegna", conflictOps());
      await expect(page.getByTestId("conflict-banner")).toBeVisible();
    },
  },
  {
    name: "expense detail with versions",
    open: async (page) => {
      await seedTrip(page, "Sardegna", conflictOps());
      await page.getByTestId("expense-row").first().click();
      await expect(page.getByTestId("versions")).toBeVisible();
      await page.waitForTimeout(500);
    },
  },
  {
    name: "PARI",
    open: async (page) => {
      await seedTrip(page, "Sardegna", dinner());
      await tab(page, "Saldi").click();
      await page.getByRole("button", { name: "Registra tutti i pagamenti suggeriti" }).click();
      await expect(page.getByTestId("pari-celebration")).toBeVisible();
      await page.waitForTimeout(2200);
    },
  },
  {
    name: "closed trip",
    open: async (page) => {
      await seedTrip(page, "Sardegna", lateOps());
      await expect(page.getByTestId("closed-bar")).toBeVisible();
    },
  },
];

for (const screen of AXE_SCREENS) {
  for (const theme of THEMES) {
    test(`${screen.name} has no axe violations, ${theme} theme`, async ({ page }) => {
      await screen.open(page);
      await applyTheme(page, theme, "system");
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }
}

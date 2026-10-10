import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { sardegna, seedTrip } from "./seed-trip.ts";
import { applyTheme, THEMES } from "./themes.ts";
import { addExpense, createTrip, sheet, tab } from "./trip-flow.ts";

// SPEC.md §15 S6, part A: Totali, export, trip editing, currency lock, remove and merge, the footer.

const openTotali = async (page: Page) => {
  await tab(page, "Saldi").click();
  await page.getByRole("group", { name: "Vista" }).getByRole("button", { name: "Totali" }).click();
};

test("Totali on the Sardegna data shows the prototype's numbers", async ({ page }) => {
  await seedTrip(page, "Sardegna 2026", sardegna());
  await openTotali(page);
  await expect(page.getByTestId("totals-total")).toHaveText("4565,18 €");
  await expect(page.getByTestId("totals-per-day")).toHaveText("570,65 € al giorno, in 8 giorni");
  await expect(page.getByTestId("totals-per-head")).toHaveText("95,11 € a testa al giorno");
  // Paid minus due is the balance Saldi shows for Sara: 1308,28 - 787,07 = 521,21.
  const sara = page.getByTestId("paid-due-row").filter({ hasText: "Sara" });
  await expect(sara).toContainText("1308,28");
  await expect(sara).toContainText("787,07");
  const bars = page.getByTestId("category-bar");
  await expect(bars.first()).toContainText("Alloggio");
  await expect(bars.first()).toContainText("1540,00");
  await expect(bars).toHaveCount(7);
});

test("Totali in English", async ({ page }) => {
  await seedTrip(page, "Sardegna 2026", sardegna());
  await tab(page, "Viaggio").click();
  await page.getByRole("group", { name: "Lingua" }).getByRole("button", { name: "English" }).click();
  await page.getByRole("navigation", { name: "Quits" }).getByRole("button", { name: "Balances" }).click();
  await page.getByRole("group", { name: "View" }).getByRole("button", { name: "Totals" }).click();
  await expect(page.getByText("Trip total")).toBeVisible();
  await expect(page.getByTestId("totals-per-head")).toContainText("per head per day");
});

test("a merge sums what was Y's and X's, and the balances follow", async ({ page }) => {
  await createTrip(page);
  await addExpense(page, { description: "Cena", amount: "90,00" });
  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "Unisci Luca" }).click();
  const dialog = sheet(page, "Unisci Luca");
  await dialog.getByRole("button", { name: "Sara", exact: true }).click();
  const summary = dialog.getByTestId("merge-summary");
  await expect(summary).toContainText("1 spesa cambia.");
  await expect(summary).toContainText("In 1 spesa compaiono tutti e due");
  await expect(summary).toContainText("Il saldo di Sara passa da -30,00 € a -45,00 €.");
  await dialog.getByRole("button", { name: "Unisci Luca in Sara" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Luca unito in Sara")).toBeVisible();

  await tab(page, "Saldi").click();
  await expect(page.getByTestId("balance-row")).toHaveCount(2);
  await expect(page.getByTestId("balance-row").filter({ hasText: "Sara" })).toContainText("deve dare 45,00");
  await expect(page.getByTestId("balance-hero")).toHaveText(/Ti devono 45,00/);
});

test("a device that was X becomes Y and is told", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "Unisci Simone" }).click();
  const dialog = sheet(page, "Unisci Simone");
  await dialog.getByRole("button", { name: "Sara", exact: true }).click();
  await dialog.getByRole("button", { name: "Unisci Simone in Sara" }).click();
  await expect(page.getByTestId("me-label")).toHaveText("Sei Sara");
  await expect(page.getByText("Simone è stato unito in Sara: da ora su questo dispositivo sei Sara.")).toBeVisible();
  await page.getByRole("button", { name: "Ho capito" }).click();
  await expect(page.getByText("da ora su questo dispositivo")).toBeHidden();
  await expect(page.getByTestId("me-label")).toHaveText("Sei Sara");
});

test("someone is removed only while they are in nothing", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Viaggio").click();
  // The device's own person stays; Sara and Luca appear in no expense yet.
  await expect(page.getByRole("button", { name: "Togli Simone" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Togli Luca" })).toBeVisible();
  await page.getByRole("button", { name: "Togli Luca" }).click();
  await expect(page.getByText("Luca tolto dai partecipanti")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rinomina Luca" })).toHaveCount(0);

  await addExpense(page, { description: "Cena", amount: "20,00" });
  await tab(page, "Viaggio").click();
  await expect(page.getByRole("button", { name: "Togli Sara" })).toHaveCount(0);
});

test("the currency can change until there is an expense, then it is disabled with the reason", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Viaggio").click();
  const select = page.getByLabel("Valuta del viaggio");
  await expect(select).toBeEnabled();
  await select.selectOption("USD");
  await expect(page.getByText("Valuta cambiata")).toBeVisible();

  await addExpense(page, { description: "Cena", amount: "20,00" });
  await expect(page.getByTestId("expense-row")).toContainText("20,00 USD");
  await tab(page, "Viaggio").click();
  await expect(select).toBeDisabled();
  await expect(page.getByText("Ci sono già spese: la valuta resta questa.")).toBeVisible();
});

test("rename and dates edits show in the trip bar", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Viaggio").click();
  await page.getByLabel("Nome del viaggio").fill("Sicilia 2026");
  await page.getByLabel("Dal").fill("2026-08-01");
  await page.getByLabel("Al", { exact: true }).fill("2026-07-30");
  await expect(page.getByText("La data di fine viene prima di quella di inizio.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Salva il viaggio" })).toBeDisabled();
  await page.getByLabel("Al", { exact: true }).fill("2026-08-08");
  await page.getByRole("button", { name: "Salva il viaggio" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sicilia 2026" })).toBeVisible();
  await expect(page.getByRole("banner")).toContainText(/01-08 agosto 2026/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Sicilia 2026" })).toBeVisible();
});

test("the exports download with the right content", async ({ page }) => {
  await createTrip(page);
  await addExpense(page, { description: "Pizza, \"da Gigi\"", amount: "45,00" });
  await tab(page, "Viaggio").click();

  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "CSV delle spese" }).click()]);
  expect(csv.suggestedFilename()).toBe("sardegna-2026-spese.csv");
  const csvText = await readFile((await csv.path())!, "utf8");
  expect(csvText).toContain("date,description,category,type,amount,currency,split,paid Simone,paid Sara,paid Luca,share Simone,share Sara,share Luca");
  expect(csvText).toContain(',"Pizza, ""da Gigi""",Altro,expense,45.00,EUR,equal,45.00,0.00,0.00,15.00,15.00,15.00');

  const [json] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Backup JSON delle operazioni" }).click()]);
  expect(json.suggestedFilename()).toBe("sardegna-2026-backup.json");
  const backup = JSON.parse(await readFile((await json.path())!, "utf8"));
  expect(backup).toMatchObject({ app: "quits", format: 1 });
  expect(backup.operations.map((o: { type: string }) => o.type)).toEqual(["TripCreated", "ExpenseCreated"]);
});

test("the footer leads back to simonepetta.com, the repo and the privacy page", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Viaggio").click();
  const footer = page.getByLabel("Informazioni su Quits");
  await expect(footer.getByRole("link", { name: "di Simone Petta" })).toHaveAttribute("href", "https://simonepetta.com/");
  await expect(footer.getByRole("link", { name: "codice" })).toHaveAttribute("href", "https://github.com/Simi24/quits");
  await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
});

const SCREENS: { name: string; open: (page: Page) => Promise<void> }[] = [
  {
    name: "Totali",
    open: async (page) => {
      await seedTrip(page, "Sardegna 2026", sardegna());
      await openTotali(page);
      await expect(page.getByTestId("totals-total")).toBeVisible();
    },
  },
  {
    name: "Viaggio",
    open: async (page) => {
      await createTrip(page);
      await tab(page, "Viaggio").click();
    },
  },
  {
    name: "merge sheet",
    open: async (page) => {
      await createTrip(page);
      await addExpense(page, { description: "Cena", amount: "90,00" });
      await tab(page, "Viaggio").click();
      await page.getByRole("button", { name: "Unisci Luca" }).click();
      await page.waitForTimeout(700);
    },
  },
];

for (const screen of SCREENS) {
  for (const theme of THEMES) {
    test(`${screen.name} has no axe violations, ${theme} theme`, async ({ page }) => {
      await screen.open(page);
      await applyTheme(page, theme, "system");
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }
}

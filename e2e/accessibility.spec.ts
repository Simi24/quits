import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { applyTheme, THEMES } from "./themes.ts";
import { activateCreatorCode, addExpense, createTrip, fillTripForm, openCreateForm, sheet, tab } from "./trip-flow.ts";

// SPEC.md §12.1: axe runs on the main screens in both themes and blocks on any violation.
const SCREENS: { name: string; open: (page: Page) => Promise<void> }[] = [
  {
    name: "landing",
    open: async (page) => {
      await page.goto("/");
      // The landing draws after IndexedDB answers, and then applies the device's theme: a theme set before
      // that would be undone (the flake of the Deploy run 37361233649 on a slow runner).
      await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
    },
  },
  {
    name: "create trip",
    open: async (page) => {
      await openCreateForm(page);
    },
  },
  {
    name: "empty Spese",
    open: async (page) => {
      await createTrip(page);
    },
  },
  {
    name: "Spese",
    open: async (page) => {
      await createTrip(page);
      await addExpense(page, { description: "Cena a Su Gologone", amount: "312,50", payer: "Sara" });
      await addExpense(page, { description: "Gelati", amount: "13,50" });
      await expect(page.getByRole("status")).toBeHidden({ timeout: 10_000 });
    },
  },
  {
    name: "expense sheet",
    open: async (page) => {
      await createTrip(page);
      await page.getByRole("button", { name: "Nuova spesa" }).click();
      await sheet(page, "Nuova spesa").getByLabel("Importo").fill("100");
      await page.waitForTimeout(700);
    },
  },
  {
    name: "expense detail",
    open: async (page) => {
      await createTrip(page);
      await addExpense(page, { description: "Cena", amount: "100,00" });
      await page.getByTestId("expense-row").click();
      await expect(page.getByRole("status")).toBeHidden({ timeout: 10_000 });
    },
  },
  {
    name: "Saldi",
    open: async (page) => {
      await createTrip(page);
      await addExpense(page, { description: "Cena", amount: "100,00" });
      await tab(page, "Saldi").click();
      await expect(page.getByRole("status")).toBeHidden({ timeout: 10_000 });
    },
  },
  {
    name: "settlement sheet",
    open: async (page) => {
      await createTrip(page);
      await addExpense(page, { description: "Cena", amount: "100,00" });
      await tab(page, "Saldi").click();
      await page.getByRole("button", { name: "Registra", exact: true }).first().click();
      await page.waitForTimeout(700);
    },
  },
  {
    name: "Grafici",
    open: async (page) => {
      await createTrip(page);
      await tab(page, "Grafici").click();
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
    name: "landing with a creator code active",
    open: async (page) => {
      await activateCreatorCode(page);
    },
  },
  {
    name: "the trip is ready",
    open: async (page) => {
      await openCreateForm(page);
      await fillTripForm(page, "Sardegna 2026", ["Simone", "Sara"]);
      await expect(page.getByRole("heading", { level: 1, name: "Il viaggio è pronto" })).toBeVisible();
    },
  },
  {
    name: "link changed",
    open: async (page) => {
      const link = await createTrip(page);
      await tab(page, "Viaggio").click();
      await page.getByRole("button", { name: "Rigenera il link" }).click();
      await page.getByRole("button", { name: "Rigenera", exact: true }).click();
      await expect(page.getByText("Link rigenerato")).toBeVisible();
      await page.goto("/");
      await page.goto(link);
      await expect(page.getByRole("heading", { level: 1, name: "Il link è cambiato" })).toBeVisible();
    },
  },
  {
    name: "trip not available",
    open: async (page) => {
      await page.goto("/v/#AAAAAAAAAAAAAAAAAAAAAA");
      await expect(page.getByRole("heading", { level: 1, name: "Questo viaggio non è più disponibile." })).toBeVisible();
    },
  },
  {
    name: "deleted trip",
    open: async (page) => {
      await createTrip(page);
      await tab(page, "Viaggio").click();
      await page.getByRole("button", { name: "Elimina il viaggio" }).click();
      await page.getByRole("button", { name: "Sì, elimina per tutti" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Questo viaggio è stato eliminato" })).toBeVisible();
    },
  },
  {
    name: "closed trip Viaggio",
    open: async (page) => {
      await createTrip(page);
      await tab(page, "Viaggio").click();
      await page.getByRole("button", { name: "Chiudi il viaggio" }).click();
      await expect(page.getByTestId("closed-bar")).toBeVisible();
      await expect(page.getByText("Viaggio chiuso", { exact: true })).toBeHidden({ timeout: 10_000 });
    },
  },
  {
    name: "who are you",
    open: async (page) => {
      await createTrip(page);
      await page.getByRole("button", { name: /^Sei / }).click();
    },
  },
];

for (const screen of SCREENS) {
  for (const theme of THEMES) {
    for (const via of ["system", "attribute"] as const) {
      test(`${screen.name} has no axe violations, ${theme} theme via ${via}`, async ({ page }) => {
        await screen.open(page);
        await applyTheme(page, theme, via);

        const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
        expect(scheme).toBe(theme);

        const { violations } = await new AxeBuilder({ page }).analyze();
        // Readable on failure: the rule, and where it hit.
        expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
      });
    }
  }
}

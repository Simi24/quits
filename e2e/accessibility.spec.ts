import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { applyTheme, THEMES } from "./themes.ts";
import { addExpense, createTrip, sheet, tab } from "./trip-flow.ts";

// SPEC.md §12.1: axe runs on the main screens in both themes and blocks on any violation.
const SCREENS: { name: string; open: (page: Page) => Promise<void> }[] = [
  { name: "landing", open: async (page) => void (await page.goto("/")) },
  {
    name: "create trip",
    open: async (page) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Crea un viaggio" }).click();
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

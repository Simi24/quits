import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

/** Creates a trip on this device through the interface and lands on its Spese tab. */
export async function createTrip(page: Page, name = "Sardegna 2026", people = ["Simone", "Sara", "Luca"]) {
  await page.goto("/");
  await page.getByRole("button", { name: "Crea un viaggio" }).click();
  await page.getByLabel("Nome del viaggio").fill(name);
  for (const person of people) {
    await page.getByLabel(/Il tuo nome|Aggiungi un nome/).fill(person);
    await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
  }
  await page.getByRole("button", { name: "Crea il viaggio" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

export const tab = (page: Page, name: "Spese" | "Saldi" | "Grafici" | "Viaggio") =>
  page.getByRole("navigation", { name: "Quits" }).getByRole("button", { name });

export const sheet = (page: Page, name: string): Locator => page.getByRole("dialog", { name });

interface ExpenseInput {
  description: string;
  amount: string;
  /** Who paid; defaults to the device's person. */
  payer?: string;
}

/** Fills and saves the new-expense sheet with an equal split among everyone. */
export async function addExpense(page: Page, { description, amount, payer }: ExpenseInput) {
  await tab(page, "Spese").click();
  await page.getByRole("button", { name: "Nuova spesa" }).click();
  const dialog = sheet(page, "Nuova spesa");
  await dialog.getByLabel("Cosa avete pagato?").fill(description);
  await dialog.getByLabel("Importo").fill(amount);
  if (payer) await dialog.getByRole("button", { name: payer, exact: true }).first().click();
  await dialog.getByRole("button", { name: "Salva la spesa" }).click();
  await expect(dialog).toBeHidden();
}

/** The device record as stored in IndexedDB, so a test can wait for a write to land before it reloads. */
export const storedDevice = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ lang: string | null; theme: string } | undefined>((resolve, reject) => {
        const open = indexedDB.open("quits");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const get = open.result.transaction("device").objectStore("device").get("device");
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => reject(get.error);
        };
      }),
  );

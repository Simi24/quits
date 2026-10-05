import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { E2E_CREATOR_CODE } from "./creator-code";

/** Enters the creator code on the landing, once per browser context: the device remembers it. */
export async function activateCreatorCode(page: Page, code = E2E_CREATOR_CODE) {
  await page.goto("/");
  await page.getByLabel("Hai un codice da creatore?").fill(code);
  await page.getByRole("button", { name: "Usa il codice" }).click();
  await expect(page.getByText("Codice attivo su questo dispositivo.")).toBeVisible();
}

/** Opens the creation form from the landing, entering the creator code first when the device does not have it yet. */
export async function openCreateForm(page: Page) {
  await page.goto("/");
  const codeField = page.getByLabel("Hai un codice da creatore?");
  const create = page.getByRole("button", { name: "Crea un viaggio" });
  // The landing reads IndexedDB before it knows whether the device has a code: wait for either answer.
  await expect(codeField.or(create)).toBeVisible();
  if (await codeField.isVisible()) await activateCreatorCode(page);
  await create.click();
}

export async function fillTripForm(page: Page, name: string, people: string[]) {
  await page.getByLabel("Nome del viaggio").fill(name);
  for (const person of people) {
    await page.getByLabel(/Il tuo nome|Aggiungi un nome/).fill(person);
    await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
  }
  await page.getByRole("button", { name: "Crea il viaggio" }).click();
}

/** Reads the link off "Il viaggio è pronto" and opens the trip. Returns the link to share. */
export async function openReadyTrip(page: Page, name: string): Promise<string> {
  await expect(page.getByRole("heading", { level: 1, name: "Il viaggio è pronto" })).toBeVisible();
  const link = await page.getByLabel("Link del viaggio").inputValue();
  await page.getByRole("button", { name: "Apri il viaggio" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return link;
}

/** Creates a trip through the interface, on the server, and lands on its Spese tab. Returns the trip link. */
export async function createTrip(page: Page, name = "Sardegna 2026", people = ["Simone", "Sara", "Luca"]): Promise<string> {
  await openCreateForm(page);
  await fillTripForm(page, name, people);
  return openReadyTrip(page, name);
}

/** A friend opens the link on their own device and picks their name. */
export async function joinTrip(page: Page, link: string, name: string, who: string) {
  await page.goto(link);
  await page.getByRole("button", { name: who, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

/** Asks the open trip to sync now, as the browser does when the tab comes back. */
export const syncNow = (page: Page) => page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));

export const syncLine = (page: Page) => page.getByTestId("sync-line");

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
      new Promise<{ lang: string | null; theme: string; tipSeen: boolean } | undefined>((resolve, reject) => {
        const open = indexedDB.open("quits");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const get = open.result.transaction("device").objectStore("device").get("device");
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => reject(get.error);
        };
      }),
  );

import { expect } from "@playwright/test";
import type { Browser, BrowserContext, Locator, Page } from "@playwright/test";
import { syncNow } from "./trip-flow";

/** A second phone: its own storage, its own network. The project's base URL and language carry over. */
export async function newDevice(browser: Browser, baseURL: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL, locale: "it-IT" });
  return { context, page: await context.newPage() };
}

/** Waits for something another device did, nudging the page to sync as the browser does when the tab comes back. */
export async function eventually(page: Page, check: () => Promise<void>) {
  await expect(async () => {
    await syncNow(page);
    await check();
  }).toPass({ timeout: 15_000, intervals: [300, 500, 1000] });
}

/** Back online: the `online` event, then everything waiting goes out. */
export async function goOnline(context: BrowserContext, page: Page) {
  await context.setOffline(false);
  await syncNow(page);
}

export const settled = (page: Page): Locator => page.getByTestId("sync-line").filter({ hasText: "Tutto salvato e sincronizzato" });

export async function editExpense(page: Page, description: string, changes: { amount?: string; description?: string }) {
  await page.getByTestId("expense-row").filter({ hasText: description }).click();
  await page.getByRole("button", { name: "Modifica", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Modifica spesa" });
  if (changes.amount) await dialog.getByLabel("Importo").fill(changes.amount);
  if (changes.description) await dialog.getByLabel("Cosa avete pagato?").fill(changes.description);
  await dialog.getByRole("button", { name: "Salva le modifiche" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Indietro" }).click();
}

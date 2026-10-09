import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { expense, expenseCreated, op, tripCreated } from "../domain/testing.ts";
import { seedTrip } from "./seed-trip.ts";
import { applyTheme, THEMES } from "./themes.ts";
import { sheet, tab } from "./trip-flow.ts";

// SPEC.md §3.16, §7.6: how to get paid, and one-tap ways to pay a suggested settlement.

const IBAN = "IT60X0542811101000000123456";
const GROUPED_IBAN = "IT60 X054 2811 1010 0000 0123 456";

/** Sara (p2) paid a 90,00 dinner shared by three: Simone and Luca owe her 30,00 each. */
const saraPaid = () => [tripCreated(), expenseCreated("e1", expense({ description: "Cena", amount: 9000, payers: [{ participantId: "p2", amount: 9000 }] }))];
const saraDetails = () =>
  op({ type: "ParticipantPaymentDetailsSet", participantId: "p2", details: { iban: IBAN, paypal: "sara", revolut: "sara1", satispayPhone: "+393331234567" } }, { id: "sara-pay", by: "p2" });

/** `window.open` and the clipboard are replaced: the test reads what was asked of them. */
const stubOutside = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __opened: string[]; __copied: string[] };
    w.__opened = [];
    w.__copied = [];
    window.open = ((url?: string | URL) => {
      w.__opened.push(String(url));
      return null;
    }) as typeof window.open;
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => void w.__copied.push(text) }, configurable: true });
  });
const opened = (page: Page) => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
const copied = (page: Page) => page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);

const paySection = (page: Page) => page.locator("#payment-details");

test("a participant's details are filled in with inline validation, saved as one operation, and kept after a reload", async ({ page }) => {
  await seedTrip(page, "Sardegna", saraPaid());
  await tab(page, "Viaggio").click();
  await expect(paySection(page).getByRole("heading", { name: "Come ricevere i soldi" })).toBeVisible();
  await expect(paySection(page).getByTestId("payment-row").filter({ hasText: "Sara" })).toContainText("Non indicato");

  await paySection(page).getByRole("button", { name: "Aggiungi come ricevere i soldi di Sara" }).click();
  const dialog = sheet(page, "Come ricevere i soldi: Sara");
  await dialog.getByLabel("IBAN").fill("IT60 X054 2811 1010 0000 0123 457");
  await dialog.getByLabel("PayPal.me").fill("sara rossi");
  await dialog.getByLabel("Satispay").fill("333 1234567");
  await dialog.getByRole("button", { name: "Salva" }).click();
  await expect(dialog.getByText("Questo IBAN non è valido. Controlla di averlo copiato per intero.")).toBeVisible();
  await expect(dialog.getByText(/Usa solo lettere e numeri, al massimo 20/)).toBeVisible();
  await expect(dialog.getByText(/Scrivi il numero con il prefisso internazionale/)).toBeVisible();

  await dialog.getByLabel("IBAN").fill("it60 x054 2811 1010 0000 0123 456");
  await dialog.getByLabel("PayPal.me").fill("https://paypal.me/sara");
  await dialog.getByLabel("Revolut").fill("@sara1");
  await dialog.getByLabel("Satispay").fill("+39 333 123 4567");
  await dialog.getByRole("button", { name: "Salva" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status")).toHaveText("Salvato");
  await expect(paySection(page).getByTestId("payment-row").filter({ hasText: "Sara" })).toContainText("IBAN, PayPal, Revolut, Satispay");

  await page.reload();
  await tab(page, "Viaggio").click();
  await paySection(page).getByRole("button", { name: "Modifica come ricevere i soldi di Sara" }).click();
  await expect(sheet(page, "Come ricevere i soldi: Sara").getByLabel("IBAN")).toHaveValue(GROUPED_IBAN);
  await expect(sheet(page, "Come ricevere i soldi: Sara").getByLabel("Satispay")).toHaveValue("+393331234567");
});

test("the history says that someone updated how to get paid, and never prints the details", async ({ page }) => {
  await seedTrip(page, "Sardegna", [...saraPaid(), saraDetails(), op({ type: "ParticipantPaymentDetailsSet", participantId: "p2", details: {} }, { id: "clear", by: "p1" })]);
  await tab(page, "Spese").click();
  await page.getByRole("button", { name: "Cronologia" }).click();
  const history = page.getByRole("dialog", { name: "Cronologia" });
  await expect(history.getByTestId("history-row").filter({ hasText: "ha aggiornato come ricevere i soldi" })).toHaveCount(1);
  await expect(history.getByTestId("history-row").filter({ hasText: "ha tolto come ricevere i soldi di Sara" })).toHaveCount(1);
  await expect(history).not.toContainText("IT60");
  await expect(history).not.toContainText("333");
});

test("clearing the details hides the Pay action again", async ({ page }) => {
  await seedTrip(page, "Sardegna", [...saraPaid(), saraDetails()]);
  await tab(page, "Saldi").click();
  await expect(page.getByRole("button", { name: "Paga Sara" })).toHaveCount(2);
  await tab(page, "Viaggio").click();
  await paySection(page).getByRole("button", { name: "Modifica come ricevere i soldi di Sara" }).click();
  await sheet(page, "Come ricevere i soldi: Sara").getByRole("button", { name: "Togli tutto" }).click();
  await expect(page.getByRole("status")).toHaveText("Dati tolti");
  await tab(page, "Saldi").click();
  await expect(page.getByRole("button", { name: "Paga Sara" })).toHaveCount(0);
});

test("Pay offers every method the creditor filled in, then records the payment", async ({ page }) => {
  await stubOutside(page);
  await seedTrip(page, "Sardegna", [...saraPaid(), saraDetails()]);
  await tab(page, "Saldi").click();
  const suggestions = page.getByTestId("suggestion");
  await expect(suggestions).toHaveCount(2);
  await suggestions.first().getByRole("button", { name: "Paga Sara" }).click();

  const dialog = sheet(page, "Paga Sara");
  await expect(dialog).toContainText("30,00");
  await expect(dialog.getByTestId("pay-iban")).toContainText(GROUPED_IBAN);

  await dialog.getByRole("button", { name: "Copia IBAN" }).click();
  await expect(dialog.getByRole("button", { name: "Copiato" })).toBeVisible();
  await dialog.getByRole("button", { name: "Apri PayPal" }).click();
  await dialog.getByRole("button", { name: "Apri Revolut" }).click();
  await dialog.getByRole("button", { name: "Copia numero Satispay" }).click();
  expect(await copied(page)).toEqual([IBAN, "+393331234567"]);
  expect(await opened(page)).toEqual(["https://paypal.me/sara/30EUR", "https://revolut.me/sara1"]);

  await dialog.getByRole("button", { name: "Segna come pagato" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status")).toHaveText("Pagamento registrato");
  await expect(suggestions).toHaveCount(1);
});

test("a creditor with no details keeps the plain row, and a creditor who is this device gets a gentle hint to the settings", async ({ page }) => {
  // Simone (this device) paid: Sara and Luca owe him. Nobody has filled anything in.
  await seedTrip(page, "Sardegna", [tripCreated(), expenseCreated("e1", expense({ description: "Cena", amount: 9000 }))]);
  await tab(page, "Saldi").click();
  await expect(page.getByRole("button", { name: /^Paga / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Registra", exact: true })).toHaveCount(2);
  await expect(page.getByTestId("payment-hint")).toHaveCount(2);
  await page.getByTestId("payment-hint").first().getByRole("button", { name: "Aggiungi i tuoi dati" }).click();
  await expect(paySection(page).getByRole("heading", { name: "Come ricevere i soldi" })).toBeInViewport();
});

test("PayPal opens the profile alone for a currency it does not take, and says so", async ({ page }) => {
  await stubOutside(page);
  await seedTrip(page, "Sardegna", [
    tripCreated({ currency: "BRL" }),
    expenseCreated("e1", expense({ description: "Cena", amount: 9000, payers: [{ participantId: "p2", amount: 9000 }] })),
    saraDetails(),
  ]);
  await tab(page, "Saldi").click();
  await page.getByTestId("suggestion").first().getByRole("button", { name: "Paga Sara" }).click();
  const dialog = sheet(page, "Paga Sara");
  await expect(dialog).toContainText("PayPal non prende questa valuta nel link");
  await dialog.getByRole("button", { name: "Apri PayPal" }).click();
  expect(await opened(page)).toEqual(["https://paypal.me/sara"]);
});

test("the shared recap carries the creditor's details, one line, and nothing for one without", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __shared: string[] };
    w.__shared = [];
    Object.defineProperty(navigator, "share", { value: async (data: { text: string }) => void w.__shared.push(data.text), configurable: true });
  });
  await seedTrip(page, "Sardegna", [...saraPaid(), saraDetails()]);
  await tab(page, "Saldi").click();
  await page.getByRole("button", { name: "Condividi riepilogo" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shared: string[] }).__shared.length)).toBe(1);
  const [text] = await page.evaluate(() => (window as unknown as { __shared: string[] }).__shared);
  const lines = (text ?? "").split("\n");
  const last = lines.findLastIndex((l) => l.startsWith("•"));
  expect(lines[last + 1]).toBe(`Sara: IBAN ${GROUPED_IBAN} | paypal.me/sara | revolut.me/sara1 | Satispay +393331234567`);
  expect(lines[last + 2]).toMatch(/^Totale del viaggio/);
});

for (const theme of THEMES) {
  test(`the details form and the Pay sheet have no axe violations, ${theme} theme`, async ({ page }) => {
    await seedTrip(page, "Sardegna", [...saraPaid(), saraDetails()]);
    await applyTheme(page, theme, "system");
    await tab(page, "Saldi").click();
    await page.getByTestId("suggestion").first().getByRole("button", { name: "Paga Sara" }).click();
    await expect(sheet(page, "Paga Sara")).toBeVisible();
    await page.waitForTimeout(700);
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
    await sheet(page, "Paga Sara").getByRole("button", { name: "Chiudi" }).click();

    await tab(page, "Viaggio").click();
    await paySection(page).getByRole("button", { name: "Modifica come ricevere i soldi di Sara" }).click();
    await sheet(page, "Come ricevere i soldi: Sara").getByLabel("IBAN").fill("IT60");
    await sheet(page, "Come ricevere i soldi: Sara").getByRole("button", { name: "Salva" }).click();
    await expect(sheet(page, "Come ricevere i soldi: Sara").getByText("Questo IBAN non è valido")).toBeVisible();
    await page.waitForTimeout(700);
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
  });
}

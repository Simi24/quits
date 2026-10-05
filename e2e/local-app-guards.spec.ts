import { expect, test } from "@playwright/test";
import { addExpense, createTrip, sheet, tab } from "./trip-flow";

// What the interface must never do with money: record twice on a double tap, or drop a write without saying why.

test("a double tap on Registra tutti records the suggested payments once", async ({ page }) => {
  await createTrip(page);
  await addExpense(page, { description: "Casa", amount: "90,00", payer: "Simone" });
  await addExpense(page, { description: "Cena", amount: "60,00", payer: "Sara" });

  await tab(page, "Saldi").click();
  await page.getByRole("button", { name: "Registra tutti i pagamenti suggeriti" }).dblclick();

  await expect(page.getByTestId("balance-hero")).toHaveText("Sei pari");
  await tab(page, "Spese").click();
  await expect(page.getByTestId("settlement-ticket")).toHaveCount(2);
});

test("a double tap on Salva la spesa saves one expense", async ({ page }) => {
  await createTrip(page);
  await page.getByRole("button", { name: "Nuova spesa" }).click();
  const dialog = sheet(page, "Nuova spesa");
  await dialog.getByLabel("Cosa avete pagato?").fill("Gelati");
  await dialog.getByLabel("Importo").fill("9,00");
  await dialog.getByRole("button", { name: "Salva la spesa" }).dblclick();

  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("expense-row")).toHaveCount(1);
});

test("a double tap on Registra records one payment", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Saldi").click();
  await page.getByRole("button", { name: "Registra un altro pagamento" }).click();
  const dialog = sheet(page, "Registra un pagamento");
  await dialog.getByLabel("A chi").selectOption({ label: "Sara" });
  await dialog.getByLabel("Importo").fill("10,00");
  await dialog.getByRole("button", { name: "Registra", exact: true }).dblclick();

  await expect(dialog).toBeHidden();
  await tab(page, "Spese").click();
  await expect(page.getByTestId("settlement-ticket")).toHaveCount(1);
});

test("an expense with no date is refused with a message", async ({ page }) => {
  await createTrip(page);
  await page.getByRole("button", { name: "Nuova spesa" }).click();
  const dialog = sheet(page, "Nuova spesa");
  await dialog.getByLabel("Cosa avete pagato?").fill("Gelati");
  await dialog.getByLabel("Importo").fill("9,00");
  await dialog.getByLabel("Data").fill("");
  await dialog.getByRole("button", { name: "Salva la spesa" }).click();

  await expect(dialog).toContainText("Scegli una data.");
  await dialog.getByLabel("Data").fill("2026-06-14");
  await dialog.getByRole("button", { name: "Salva la spesa" }).click();
  await expect(page.getByTestId("expense-row")).toHaveCount(1);
});

test("a payment with no date cannot be recorded, and says why", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Saldi").click();
  await page.getByRole("button", { name: "Registra un altro pagamento" }).click();
  const dialog = sheet(page, "Registra un pagamento");
  await dialog.getByLabel("A chi").selectOption({ label: "Sara" });
  await dialog.getByLabel("Importo").fill("10,00");
  await dialog.getByLabel("Data").fill("");

  await expect(dialog).toContainText("Scegli una data.");
  await expect(dialog.getByRole("button", { name: "Registra", exact: true })).toBeDisabled();
});

test("a payment recorded before any expense shows on the roll and can be opened", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Saldi").click();
  await page.getByRole("button", { name: "Registra un altro pagamento" }).click();
  const dialog = sheet(page, "Registra un pagamento");
  await dialog.getByLabel("A chi").selectOption({ label: "Sara" });
  await dialog.getByLabel("Importo").fill("10,00");
  await dialog.getByRole("button", { name: "Registra", exact: true }).click();

  await tab(page, "Spese").click();
  await page.getByTestId("settlement-ticket").click();
  await expect(sheet(page, "Pagamento").getByRole("button", { name: "Elimina il pagamento" })).toBeVisible();
});

test("names longer than the log accepts are cut while typing, never lost on save", async ({ page }) => {
  const long = "Giro della Sardegna in barca a vela, ".repeat(4);
  await page.goto("/");
  await page.getByRole("button", { name: "Crea un viaggio" }).click();
  await page.getByLabel("Nome del viaggio").fill(long);
  for (const person of ["Simone", "Sara"]) {
    await page.getByLabel(/Il tuo nome|Aggiungi un nome/).fill(person);
    await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
  }
  await page.getByRole("button", { name: "Crea il viaggio" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(long.slice(0, 100).trim());

  await tab(page, "Viaggio").click();
  await page.getByLabel("Aggiungi un nome").fill("L".repeat(140));
  await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
  await expect(page.getByText("L".repeat(100), { exact: true })).toBeVisible();
});

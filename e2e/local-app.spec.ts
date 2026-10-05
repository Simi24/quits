import { expect, test } from "@playwright/test";
import { addExpense, createTrip, sheet, storedDevice, tab } from "./trip-flow";

// SPEC.md §15 S2: on one device, offline, a whole trip can be recorded and settled.

test("adds an expense: it lands on the roll, in the summary and in the balances", async ({ page }) => {
  await createTrip(page);
  await expect(page.getByText("Ancora nessuna spesa.")).toBeVisible();

  await addExpense(page, { description: "Traghetto", amount: "90,00" });

  const row = page.getByTestId("expense-row").filter({ hasText: "Traghetto" });
  await expect(row).toContainText("90,00");
  await expect(row).toContainText("Pagato da Simone");
  await expect(row).toContainText("tua parte 30,00");
  await expect(page.getByText("Spesi finora")).toBeVisible();

  await tab(page, "Saldi").click();
  await expect(page.getByTestId("balance-hero")).toHaveText(/Ti devono 60,00/);
  await expect(page.getByTestId("balance-row").filter({ hasText: "Sara" })).toContainText("deve dare 30,00");
});

test("edits an expense: the new amount replaces the old everywhere", async ({ page }) => {
  await createTrip(page);
  await addExpense(page, { description: "Cena", amount: "60,00" });

  await page.getByTestId("expense-row").click();
  await page.getByRole("button", { name: "Modifica", exact: true }).click();
  const dialog = sheet(page, "Modifica spesa");
  await expect(dialog.getByLabel("Importo")).toHaveValue("60,00");
  await dialog.getByLabel("Importo").fill("75,00");
  await dialog.getByLabel("Cosa avete pagato?").fill("Cena di pesce");
  await dialog.getByRole("button", { name: "Salva le modifiche" }).click();

  await expect(page.getByTestId("detail-amount")).toHaveText("75,00 €");
  await expect(page.getByRole("heading", { name: "Cena di pesce" })).toBeVisible();
  await page.getByRole("button", { name: "Indietro" }).click();
  await expect(page.getByTestId("expense-row")).toHaveCount(1);
  await expect(page.getByTestId("expense-row")).toContainText("Cena di pesce");
});

test("refuses to save a split that does not add up, and says why", async ({ page }) => {
  await createTrip(page);
  await page.getByRole("button", { name: "Nuova spesa" }).click();
  const dialog = sheet(page, "Nuova spesa");
  await dialog.getByLabel("Cosa avete pagato?").fill("Cena");
  await dialog.getByLabel("Importo").fill("90,00");

  await dialog.getByRole("button", { name: "Importi", exact: true }).click();
  await dialog.getByLabel("Simone", { exact: true }).fill("50,00");
  await dialog.getByLabel("Sara", { exact: true }).fill("30,00");
  await expect(dialog).toContainText("Mancano 10,00 € da assegnare.");
  await dialog.getByRole("button", { name: "Salva la spesa" }).click();
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Sara", { exact: true }).fill("50,00");
  await expect(dialog).toContainText("Hai assegnato 10,00 € di troppo.");

  await dialog.getByLabel("Sara", { exact: true }).fill("40,00");
  await expect(dialog).not.toContainText("Mancano");
  await expect(dialog).not.toContainText("di troppo");

  await dialog.getByRole("button", { name: "Percentuali", exact: true }).click();
  await dialog.getByLabel("Simone %").fill("50");
  await dialog.getByLabel("Sara %").fill("30,5");
  await expect(dialog).toContainText("Le percentuali fanno 80,5%: devono fare 100%.");

  await dialog.getByRole("button", { name: "Quote", exact: true }).click();
  for (const name of ["Simone", "Sara", "Luca"]) {
    await dialog.getByRole("group", { name }).getByRole("button", { name: "-1" }).click();
  }
  await expect(dialog).toContainText("Dai almeno una quota a qualcuno.");

  await dialog.getByRole("button", { name: "Uguale", exact: true }).click();
  await dialog.getByRole("button", { name: "Simone", exact: true }).last().click();
  await dialog.getByRole("button", { name: "Sara", exact: true }).last().click();
  await dialog.getByRole("button", { name: "Luca", exact: true }).last().click();
  await expect(dialog).toContainText("Scegli almeno una persona.");
});

test("asks for a description and an amount only when saving", async ({ page }) => {
  await createTrip(page);
  await page.getByRole("button", { name: "Nuova spesa" }).click();
  const dialog = sheet(page, "Nuova spesa");
  await expect(dialog).not.toContainText("Scrivi cosa avete pagato.");
  await dialog.getByRole("button", { name: "Salva la spesa" }).click();
  await expect(dialog).toContainText("Scrivi cosa avete pagato.");
  await expect(dialog).toContainText("Inserisci un importo maggiore di zero.");
});

test("shows who got the leftover cent, in the sheet and in the detail", async ({ page }) => {
  await createTrip(page);
  await page.getByRole("button", { name: "Nuova spesa" }).click();
  const dialog = sheet(page, "Nuova spesa");
  await dialog.getByLabel("Cosa avete pagato?").fill("Gelati");
  await dialog.getByLabel("Importo").fill("100,00");
  await expect(dialog.getByTestId("leftover-note")).toHaveText("Avanza 1 centesimo: va a Simone.");
  await expect(dialog.getByTestId("share-Simone")).toContainText("33,34 €");
  await expect(dialog.getByTestId("share-Simone")).toContainText("+0,01 €");
  await dialog.getByRole("button", { name: "Salva la spesa" }).click();

  await page.getByTestId("expense-row").click();
  await expect(page.getByTestId("detail-leftover")).toHaveText("Avanza 1 centesimo: va a Simone.");
});

test("records a refund and an expense paid by several people", async ({ page }) => {
  await createTrip(page);
  await page.getByRole("button", { name: "Nuova spesa" }).click();
  const dialog = sheet(page, "Nuova spesa");
  await dialog.getByLabel("Cosa avete pagato?").fill("Casa");
  await dialog.getByLabel("Importo").fill("100,00");
  await dialog.getByRole("button", { name: "Hanno pagato in più persone" }).click();
  await dialog.getByLabel("Simone", { exact: true }).first().fill("60,00");
  await dialog.getByLabel("Sara", { exact: true }).first().fill("30,00");
  await expect(dialog).toContainText("Ai paganti mancano 10,00 €.");
  await dialog.getByLabel("Sara", { exact: true }).first().fill("40,00");
  await dialog.getByRole("button", { name: "Salva la spesa" }).click();
  await expect(page.getByTestId("expense-row")).toContainText("Pagato da Simone e altri 1");

  await page.getByRole("button", { name: "Nuova spesa" }).click();
  const refund = sheet(page, "Nuova spesa");
  await refund.getByRole("button", { name: "Rimborso", exact: true }).click();
  await refund.getByLabel("Cosa vi hanno restituito?").fill("Caparra");
  await refund.getByLabel("Importo").fill("30,00");
  await refund.getByRole("button", { name: "Luca", exact: true }).first().click();
  await refund.getByRole("button", { name: "Salva la spesa" }).click();

  const row = page.getByTestId("expense-row").filter({ hasText: "Caparra" });
  await expect(row).toContainText("Rimborso");
  await expect(row).toContainText("Ricevuto da Luca");
  await expect(row).toContainText("-30,00");
});

test("settling all suggested payments brings every balance to zero", async ({ page }) => {
  await createTrip(page);
  await addExpense(page, { description: "Casa", amount: "90,00", payer: "Simone" });
  await addExpense(page, { description: "Cena", amount: "60,00", payer: "Sara" });

  await tab(page, "Saldi").click();
  await expect(page.getByTestId("suggestion")).toHaveCount(2);
  await page.getByRole("button", { name: "Registra tutti i pagamenti suggeriti" }).click();

  await expect(page.getByTestId("balance-hero")).toHaveText("Sei pari");
  await expect(page.getByText("PARI", { exact: true })).toBeVisible();
  await expect(page.getByText("Siete tutti pari")).toBeVisible();
  for (const row of await page.getByTestId("balance-row").all()) await expect(row).toContainText("è pari");

  await tab(page, "Spese").click();
  await expect(page.getByTestId("settlement-ticket")).toHaveCount(2);
  await expect(page.getByTestId("settlement-ticket").first()).toContainText("Luca ha dato a");
});

test("records a single suggested payment from its ticket, and deletes it with undo", async ({ page }) => {
  await createTrip(page);
  await addExpense(page, { description: "Casa", amount: "90,00" });

  await tab(page, "Saldi").click();
  await page.getByRole("button", { name: "Registra", exact: true }).first().click();
  const dialog = sheet(page, "Registra un pagamento");
  await expect(dialog.getByLabel("Importo")).toHaveValue("30,00");
  await dialog.getByRole("button", { name: "Registra", exact: true }).click();
  await expect(page.getByTestId("suggestion")).toHaveCount(1);

  await tab(page, "Spese").click();
  await page.getByTestId("settlement-ticket").click();
  await sheet(page, "Pagamento").getByRole("button", { name: "Elimina il pagamento" }).click();
  await expect(page.getByTestId("settlement-ticket")).toHaveCount(0);
  await page.getByRole("button", { name: "Annulla" }).click();
  await expect(page.getByTestId("settlement-ticket")).toHaveCount(1);
});

test("warns about a possible duplicate settlement and refuses the same person twice", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Saldi").click();
  await page.getByRole("button", { name: "Registra un altro pagamento" }).click();
  const dialog = sheet(page, "Registra un pagamento");
  await dialog.getByLabel("A chi").selectOption({ label: "Sara" });
  await dialog.getByLabel("Importo").fill("10,00");
  await dialog.getByRole("button", { name: "Registra", exact: true }).click();

  await page.getByRole("button", { name: "Registra un altro pagamento" }).click();
  const again = sheet(page, "Registra un pagamento");
  await again.getByLabel("A chi").selectOption({ label: "Sara" });
  await again.getByLabel("Importo").fill("10,00");
  await expect(again).toContainText("C'è già un pagamento uguale in questa data.");

  await again.getByLabel("A chi").selectOption({ label: "Simone" });
  await expect(again).toContainText("Scegli due persone diverse.");
  await expect(again.getByRole("button", { name: "Registra", exact: true })).toBeDisabled();
});

test("deleting an expense takes it out of the balances, and undo brings it back", async ({ page }) => {
  await createTrip(page);
  await addExpense(page, { description: "Cena", amount: "60,00" });
  await page.getByTestId("expense-row").click();
  await page.getByRole("button", { name: "Elimina", exact: true }).click();
  await page.getByRole("button", { name: "Sì, elimina" }).click();
  await expect(page.getByTestId("expense-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Annulla" }).click();
  await expect(page.getByTestId("expense-row")).toHaveCount(1);
});

test("searches by description and by category name", async ({ page }) => {
  await createTrip(page);
  await addExpense(page, { description: "Pizza", amount: "20,00" });
  await addExpense(page, { description: "Benzina", amount: "40,00" });

  await page.getByLabel("Cerca tra le spese").fill("pizz");
  await expect(page.getByTestId("expense-row")).toHaveCount(1);
  await page.getByLabel("Cerca tra le spese").fill("zzz");
  await expect(page.getByText('Nessuna spesa con "zzz".')).toBeVisible();
});

test("Viaggio: adds and renames participants, sets the default split, adds and deletes a category", async ({ page }) => {
  await createTrip(page, "Dolomiti", ["Simone", "Sara"]);
  await tab(page, "Viaggio").click();

  await page.getByLabel("Aggiungi un nome").fill("Luca");
  await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Luca" })).toBeVisible();

  await page.getByRole("button", { name: "Rinomina Sara" }).click();
  await page.getByLabel("Rinomina Sara").fill("Sara R.");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.getByText("Sara R.")).toBeVisible();

  await page.getByRole("button", { name: "Per quote" }).click();
  await page.getByRole("group", { name: "Luca" }).getByRole("button", { name: "+1" }).click();
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.getByTestId("default-split-summary")).toContainText("Per quote: Simone 1, Sara R. 1, Luca 2");

  await page.getByLabel("Emoji").fill("🍹");
  await page.getByLabel("Nome", { exact: true }).fill("Aperitivi");
  await page.getByRole("button", { name: "Aggiungi categoria" }).click();
  await expect(page.getByText("Aperitivi")).toBeVisible();

  // The new expense is prefilled with the default split and offers the new category.
  await tab(page, "Spese").click();
  await page.getByRole("button", { name: "Nuova spesa" }).click();
  const dialog = sheet(page, "Nuova spesa");
  await expect(dialog.getByText("Precompilata con la divisione predefinita del viaggio.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Aperitivi" })).toBeVisible();
  await page.keyboard.press("Escape");

  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "Elimina Aperitivi" }).click();
  await expect(page.getByText("Aperitivi")).toHaveCount(0);
});

test("reload keeps the trip, the expenses, the payments and who you are", async ({ page }) => {
  await createTrip(page);
  await addExpense(page, { description: "Cena", amount: "60,00", payer: "Sara" });
  await tab(page, "Saldi").click();
  await page.getByRole("button", { name: "Registra", exact: true }).first().click();
  await sheet(page, "Registra un pagamento").getByRole("button", { name: "Registra", exact: true }).click();
  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "Non sono io" }).click();
  await page.getByRole("button", { name: "Sara", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sei Sara" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { level: 1, name: "Sardegna 2026" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sei Sara" })).toBeVisible();
  await expect(page.getByTestId("expense-row")).toContainText("Cena");
  await expect(page.getByTestId("settlement-ticket")).toHaveCount(1);
});

test("two trips on one device never touch each other", async ({ page }) => {
  await createTrip(page, "Sardegna 2026");
  await addExpense(page, { description: "Cena", amount: "60,00" });
  await page.getByRole("button", { name: "Torna all'inizio" }).click();
  await expect(page.getByRole("button", { name: "Crea un viaggio" })).toBeVisible();

  await createTrip(page, "Dolomiti", ["Anna", "Bruno"]);
  await expect(page.getByTestId("expense-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Torna all'inizio" }).click();

  await expect(page.getByRole("button", { name: /Sardegna 2026/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Dolomiti/ })).toBeVisible();
  await page.getByRole("button", { name: /Sardegna 2026/ }).click();
  await expect(page.getByTestId("expense-row")).toHaveCount(1);
});

test("the language and theme are per device and survive a reload", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.getByRole("button", { name: "Expenses" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => storedDevice(page)).toMatchObject({ lang: "en", theme: "dark" });

  await page.reload();

  await expect(page.getByRole("button", { name: "Expenses" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("loads offline after the first visit, with everything recorded before", async ({ page, context }) => {
  await createTrip(page);
  await addExpense(page, { description: "Cena", amount: "60,00" });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("heading", { level: 1, name: "Sardegna 2026" })).toBeVisible();
  await expect(page.getByTestId("expense-row")).toContainText("Cena");

  // And a whole expense can still be recorded with no network.
  await addExpense(page, { description: "Gelati", amount: "9,00" });
  await expect(page.getByTestId("expense-row")).toHaveCount(2);
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replaceAll('"', ""));
  });
  expect(fonts).toEqual(expect.arrayContaining(["Bagel Fat One", "Onest"]));
});

test("the landing switches language from its IT/EN switch, as in the prototype", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("button", { name: "Create a trip" })).toBeVisible();
  await expect(page.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
});

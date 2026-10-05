import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { op, tripCreated } from "../domain/testing.ts";
import { seedTrip } from "./seed-trip.ts";
import { storedDevice, tab } from "./trip-flow.ts";

// Issue #28: a compact IT/EN switch, "Come funziona", explanatory empty states, one first-use tip (SPEC.md §7.6).

const PHONE = { width: 390, height: 844 };
// The corner pill is the only language switch on the landing (SPEC.md §7.8).
const langSwitch = (page: Page) => page.getByRole("group", { name: /^(Lingua|Language)$/ });
const tip = (page: Page) => page.getByTestId("first-tip");
const leaveTrip = async (page: Page) => {
  await page.getByRole("button", { name: "Torna all'inizio" }).click();
  // The device forgets the open trip only after the landing shows; reloading earlier would come back to it.
  await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
};
const emptyTrip = () => [tripCreated({ name: "Estate" })];

test.describe("landing", () => {
  test.use({ viewport: PHONE });

  test("the IT/EN switch sits on the brand row and never moves the title", async ({ page }) => {
    await page.goto("/");
    const title = page.getByRole("heading", { level: 1, name: "quits" });
    await expect(title).toBeVisible();
    const before = await title.boundingBox();
    const box = await langSwitch(page).boundingBox();
    // The title is up in the first 90 px, and the switch shares its row instead of sitting above it.
    expect(before!.y).toBeLessThan(90);
    expect(box!.y).toBeLessThan(before!.y + before!.height);
    expect(box!.y + box!.height).toBeLessThan(before!.y + before!.height + 20);
    // Compact, and inside the screen.
    expect(box!.height).toBeLessThan(44);
    expect(box!.x + box!.width).toBeLessThanOrEqual(PHONE.width);

    await langSwitch(page).getByRole("button", { name: "EN" }).click();
    await expect(page.getByText("Who paid for what on holiday, and how to get even.")).toBeVisible();
    expect(await title.boundingBox()).toEqual(before);
    expect(await langSwitch(page).boundingBox()).toEqual(box);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(PHONE.width);
  });

  test("the footer has no big selectors; the corner has the language pill and a theme button", async ({ page }) => {
    await page.goto("/");
    await expect(langSwitch(page)).toHaveCount(1);
    await expect(page.getByRole("group", { name: "Tema" })).toHaveCount(0);
    await expect(page.getByLabel("Informazioni su Quits").getByRole("group")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tema: sistema" })).toBeVisible();
  });

  test("the theme button cycles system, light, dark and keeps the title and the pill where they are", async ({ page }) => {
    await page.goto("/");
    const title = page.getByRole("heading", { level: 1, name: "quits" });
    const titleBox = await title.boundingBox();
    const pill = await langSwitch(page).boundingBox();
    const button = page.getByRole("button", { name: /^Tema: / });
    const buttonBox = await button.boundingBox();
    // Same height as the pill, on the same row, inside the screen.
    expect(buttonBox!.height).toBeCloseTo(pill!.height, 0);
    expect(buttonBox!.y).toBeCloseTo(pill!.y, 0);
    expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(PHONE.width);
    expect(buttonBox!.x).toBeGreaterThan(pill!.x + pill!.width - 1);
    // It does not sit over the wordmark.
    expect(Math.max(buttonBox!.x, pill!.x)).toBeGreaterThanOrEqual(titleBox!.x + titleBox!.width - 4);

    const root = page.locator("html");
    await button.click();
    await expect(page.getByRole("button", { name: "Tema: chiaro" })).toBeVisible();
    await expect(root).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Tema: chiaro" }).click();
    await expect(root).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Tema: scuro" }).click();
    await expect(root).not.toHaveAttribute("data-theme");
    await expect(page.getByRole("button", { name: "Tema: sistema" })).toBeVisible();

    await langSwitch(page).getByRole("button", { name: "EN" }).click();
    await expect(page.getByRole("button", { name: "Theme: system" })).toBeVisible();
    expect(await title.boundingBox()).toEqual(titleBox);
    expect(await langSwitch(page).boundingBox()).toEqual(pill);
  });

  test("the theme chosen on the landing is kept on the device", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Tema: sistema" }).click();
    await expect.poll(async () => (await storedDevice(page))?.theme).toBe("light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("Come funziona shows the three steps in Italian and in English", async ({ page }) => {
    await page.goto("/");
    const how = page.getByTestId("how-it-works");
    await expect(how.getByRole("heading", { level: 2, name: "Come funziona" })).toBeVisible();
    await expect(how.getByRole("listitem")).toHaveText([/Crea il viaggio/, /Manda il link/, /Segnate le spese.*chi deve dare cosa a chi/]);

    await langSwitch(page).getByRole("button", { name: "EN" }).click();
    await expect(how.getByRole("heading", { level: 2, name: "How it works" })).toBeVisible();
    await expect(how.getByRole("listitem")).toHaveText([/Create the trip/, /Send the link/, /Record the expenses.*who owes what to whom/]);
  });
});

test.describe("empty states", () => {
  test("Spese, Saldi, Totali and Grafici say what they will hold and how to start", async ({ page }) => {
    await seedTrip(page, "Estate", emptyTrip());
    const empty = page.getByTestId("empty-state");
    await expect(empty).toContainText("Ancora nessuna spesa.");
    await expect(empty).toContainText("Tocca + per aggiungere la prima spesa");

    await tab(page, "Saldi").click();
    await expect(empty).toContainText("Ancora nessun saldo.");
    await page.getByRole("group", { name: "Vista" }).getByRole("button", { name: "Totali" }).click();
    await expect(empty).toContainText("Ancora niente da sommare.");

    await tab(page, "Grafici").click();
    await expect(empty).toContainText("Ancora nessun grafico.");
    await expect(empty).toContainText("otto grafici");
  });

  test("they are in English too", async ({ page }) => {
    await seedTrip(page, "Estate", emptyTrip());
    await tab(page, "Viaggio").click();
    await page.getByRole("group", { name: "Lingua" }).getByRole("button", { name: "English" }).click();
    const empty = page.getByTestId("empty-state");
    await page.getByRole("navigation", { name: "Quits" }).getByRole("button", { name: "Charts" }).click();
    await expect(empty).toContainText("No charts yet.");
    await page.getByRole("navigation", { name: "Quits" }).getByRole("button", { name: "Balances" }).click();
    await expect(empty).toContainText("No balances yet.");
    await page.getByRole("navigation", { name: "Quits" }).getByRole("button", { name: "Expenses" }).click();
    await expect(empty).toContainText("No expenses yet.");
  });

  test("a closed trip with no expenses does not tell you to tap +", async ({ page }) => {
    await seedTrip(page, "Estate", [...emptyTrip(), op({ type: "TripClosed" })]);
    await expect(page.getByTestId("empty-state")).toContainText("Questo viaggio si è chiuso senza spese.");
    await expect(page.getByTestId("empty-state")).not.toContainText("Tocca +");
  });
});

test.describe("first-use tip", () => {
  test("appears beside + on the first trip opened, once", async ({ page }) => {
    await seedTrip(page, "Estate", emptyTrip());
    await expect(tip(page)).toContainText("Tocca + per segnare una spesa");
    // It does not cover the + button.
    const fab = await page.getByRole("button", { name: "Nuova spesa" }).boundingBox();
    const bubble = await tip(page).boundingBox();
    expect(bubble!.x + bubble!.width).toBeLessThanOrEqual(fab!.x);

    await page.getByRole("button", { name: "Chiudi il suggerimento" }).click();
    await expect(tip(page)).toBeHidden();
    await expect.poll(async () => (await storedDevice(page))?.tipSeen).toBe(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Estate" })).toBeVisible();
    await expect(tip(page)).toBeHidden();
  });

  test("is per device: dismissed once, a second trip does not show it", async ({ page }) => {
    await seedTrip(page, "Estate", emptyTrip());
    await page.getByRole("button", { name: "Chiudi il suggerimento" }).click();
    await leaveTrip(page);
    await seedTrip(page, "Inverno", [tripCreated({ name: "Inverno" })]);
    await expect(tip(page)).toBeHidden();
  });

  test("tapping + counts: the first expense ends the tip for good", async ({ page }) => {
    await seedTrip(page, "Estate", emptyTrip());
    await page.getByRole("button", { name: "Nuova spesa" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuova spesa" });
    await dialog.getByLabel("Cosa avete pagato?").fill("Cena");
    await dialog.getByLabel("Importo").fill("30");
    await dialog.getByRole("button", { name: "Salva la spesa" }).click();
    await expect(dialog).toBeHidden();
    await expect(tip(page)).toBeHidden();
    await expect.poll(async () => (await storedDevice(page))?.tipSeen).toBe(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Estate" })).toBeVisible();
    await expect(tip(page)).toBeHidden();
  });

  test("is not shown on a closed trip, and is still there for the next open trip", async ({ page }) => {
    await seedTrip(page, "Estate", [...emptyTrip(), op({ type: "TripClosed" })]);
    await expect(page.getByTestId("closed-bar")).toBeVisible();
    await expect(tip(page)).toBeHidden();
    await leaveTrip(page);
    await seedTrip(page, "Inverno", [tripCreated({ name: "Inverno" })]);
    await expect(tip(page)).toBeVisible();
  });

  test("is in English with an English device", async ({ page }) => {
    await seedTrip(page, "Estate", emptyTrip());
    await tab(page, "Viaggio").click();
    await page.getByRole("group", { name: "Lingua" }).getByRole("button", { name: "English" }).click();
    await page.getByRole("navigation", { name: "Quits" }).getByRole("button", { name: "Expenses" }).click();
    await expect(tip(page)).toContainText("Tap + to record an expense");
  });
});

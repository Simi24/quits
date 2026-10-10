import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { expense, expenseCreated, tripCreated } from "../domain/testing.ts";
import { eventually, newDevice } from "./devices.ts";
import { seedTrip } from "./seed-trip.ts";
import { applyTheme, THEMES } from "./themes.ts";
import { createTrip, joinTrip, sheet, tab } from "./trip-flow.ts";

// SPEC.md §3.17, §7.6: "chi sei?" is asked once; changing it afterwards is an operation everyone sees.

const trip = () => [tripCreated(), expenseCreated("e1", expense({ description: "Cena", amount: 9000 }))];
const meLabel = (page: Page) => page.getByTestId("me-label");
const identityRows = (page: Page) => page.locator('[data-testid="history-row"][data-op-type="IdentityChanged"]');
const openHistory = async (page: Page) => {
  await tab(page, "Spese").click();
  await page.getByRole("button", { name: "Cronologia" }).click();
  await expect(page.getByRole("dialog", { name: "Cronologia" })).toBeVisible();
};
const changeTo = async (page: Page, name: string) => {
  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: /^Non sei .+\? Cambia$/ }).click();
  const dialog = sheet(page, "Chi sei su questo telefono?");
  await dialog.getByRole("button", { name, exact: true }).click();
  await dialog.getByRole("button", { name: `Sono ${name}` }).click();
  await expect(dialog).toBeHidden();
};

test("the header says who you are but is not a button", async ({ page }) => {
  await seedTrip(page, "Sardegna", trip());
  await expect(meLabel(page)).toHaveText("Sei Simone");
  await expect(page.getByRole("button", { name: /^Sei / })).toHaveCount(0);
  await expect(page.getByText("Sei Simone", { exact: true })).toBeVisible();
});

test("changing who you are lives in Viaggio, says everyone will see it, and switches the device", async ({ page }) => {
  await seedTrip(page, "Sardegna", trip());
  await tab(page, "Viaggio").click();
  await expect(page.getByRole("heading", { name: "Su questo telefono sei Simone" })).toBeVisible();
  await page.getByRole("button", { name: "Non sei Simone? Cambia" }).click();
  const dialog = sheet(page, "Chi sei su questo telefono?");
  await expect(dialog.getByText("Il cambio compare per tutti nella cronologia del viaggio.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Simone", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Sara", exact: true }).click();
  await dialog.getByRole("button", { name: "Sono Sara" }).click();

  await expect(meLabel(page)).toHaveText("Sei Sara");
  await expect(page.getByRole("heading", { name: "Su questo telefono sei Sara" })).toBeVisible();
  await page.reload();
  await expect(meLabel(page)).toHaveText("Sei Sara");

  await openHistory(page);
  const row = identityRows(page);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Da questo telefono, Simone ora è Sara");
});

test("it changes no balance and no expense", async ({ page }) => {
  await seedTrip(page, "Sardegna", trip());
  await tab(page, "Saldi").click();
  await expect(page.getByTestId("balance-row")).toHaveCount(3);
  const rows = async () => (await page.getByTestId("balance-row").allInnerTexts()).map((text) => text.replace(" (tu)", ""));
  const before = await rows();
  await changeTo(page, "Sara");
  await tab(page, "Saldi").click();
  expect(await rows()).toEqual(before);
});

test("it works offline and the line reaches a second phone after sync; the first choice and a merge write no line", async ({ page, browser, baseURL }) => {
  const link = await createTrip(page, "Sardegna 2026", ["Simone", "Sara", "Luca"]);
  const friend = await newDevice(browser, baseURL as string);
  await joinTrip(friend.page, link, "Sardegna 2026", "Luca");

  await openHistory(friend.page);
  await expect(identityRows(friend.page)).toHaveCount(0);
  await friend.page.getByRole("dialog", { name: "Cronologia" }).getByRole("button", { name: "Indietro" }).click();

  await page.context().setOffline(true);
  await changeTo(page, "Sara");
  await expect(meLabel(page)).toHaveText("Sei Sara");
  await page.context().setOffline(false);

  await eventually(friend.page, async () => {
    await friend.page.getByRole("button", { name: "Cronologia" }).click();
    await expect(identityRows(friend.page)).toHaveCount(1, { timeout: 1000 });
  });
  await expect(identityRows(friend.page)).toContainText("Da questo telefono, Simone ora è Sara");
  await expect(meLabel(friend.page)).toHaveText("Sei Luca");

  // A merge moves the device from Sara to Luca on its own: already in the history as the merge, no identity line.
  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "Unisci Sara" }).click();
  const merge = sheet(page, "Unisci Sara");
  await merge.getByRole("button", { name: "Luca", exact: true }).click();
  await merge.getByRole("button", { name: "Unisci Sara in Luca" }).click();
  await expect(meLabel(page)).toHaveText("Sei Luca");
  await openHistory(page);
  await expect(identityRows(page)).toHaveCount(1);
  await friend.context.close();
});

test.describe("at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const theme of THEMES) {
    test(`is accessible in the ${theme} theme`, async ({ page }) => {
      await seedTrip(page, "Sardegna", trip());
      await applyTheme(page, theme, "system");
      const shot = async (name: string) => {
        if (!process.env.IDENT_SHOTS) return;
        mkdirSync(process.env.IDENT_SHOTS, { recursive: true });
        await page.screenshot({ path: `${process.env.IDENT_SHOTS}/${name}-${theme}.png` });
      };
      const clean = async () => expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

      await expect(meLabel(page)).toBeVisible();
      await clean();
      await tab(page, "Viaggio").click();
      await expect(page.getByRole("heading", { name: "Su questo telefono sei Simone" })).toBeVisible();
      await clean();
      await shot("viaggio");

      await page.getByRole("button", { name: "Non sei Simone? Cambia" }).click();
      await expect(sheet(page, "Chi sei su questo telefono?")).toBeVisible();
      await page.waitForTimeout(700);
      await clean();
      await shot("sheet");
      await sheet(page, "Chi sei su questo telefono?").getByRole("button", { name: "Sono Sara" }).click();

      await openHistory(page);
      await expect(identityRows(page)).toHaveCount(1);
      await page.waitForTimeout(700);
      await clean();
      await shot("history");
    });
  }
});

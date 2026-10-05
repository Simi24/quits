import { expect, test } from "@playwright/test";
import { eventually, newDevice, settled } from "./devices";
import { createTrip, joinTrip, sheet, tab } from "./trip-flow";

// SPEC.md §7.6 item 14: a trip closed by sync takes the sheets that would change it off the screen.

const SHEETS = [
  { name: "the expense sheet", tab: "Spese", opener: "Nuova spesa", dialog: "Nuova spesa" },
  { name: "the settlement sheet", tab: "Saldi", opener: "Registra un altro pagamento", dialog: "Registra un pagamento" },
] as const;

for (const open of SHEETS) {
  test(`${open.name} closes when another device closes the trip`, async ({ page, browser, baseURL }) => {
    const link = await createTrip(page, "Sardegna 2026", ["Simone", "Sara"]);
    const friend = await newDevice(browser, baseURL as string);
    await joinTrip(friend.page, link, "Sardegna 2026", "Sara");
    await expect(settled(friend.page)).toBeVisible();

    await tab(friend.page, open.tab).click();
    await friend.page.getByRole("button", { name: open.opener }).click();
    await expect(sheet(friend.page, open.dialog)).toBeVisible();

    await tab(page, "Viaggio").click();
    await page.getByRole("button", { name: "Chiudi il viaggio" }).click();
    await expect(page.getByTestId("closed-bar")).toBeVisible();

    await eventually(friend.page, async () => {
      await expect(friend.page.getByTestId("closed-bar")).toBeVisible({ timeout: 1000 });
    });
    await expect(sheet(friend.page, open.dialog)).toBeHidden();
    await expect(friend.page.getByTestId("closed-bar")).toContainText("Viaggio chiuso, sola lettura.");
    await friend.context.close();
  });
}

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { activateCreatorCode, createTrip, fillTripForm, openCreateForm, sheet, tab } from "./trip-flow.ts";

// Issue #29: on a phone nothing scrolls sideways, the two date fields never overlap, and no form
// control is small enough to make iOS zoom the page on focus. Runs on the "pixel" and "iphone" projects.
const WIDTHS = [360, 390];
const SCREENS: { name: string; open: (page: Page) => Promise<void> }[] = [
  { name: "landing", open: async (page) => void (await activateCreatorCode(page)) },
  { name: "create trip", open: async (page) => void (await openCreateForm(page)) },
  {
    name: "the trip is ready",
    open: async (page) => {
      await openCreateForm(page);
      await fillTripForm(page, "Sardegna 2026", ["Simone", "Sara"]);
      await expect(page.getByRole("heading", { level: 1, name: "Il viaggio è pronto" })).toBeVisible();
    },
  },
  {
    name: "Spese",
    open: async (page) => {
      await createTrip(page);
    },
  },
  {
    name: "expense sheet",
    open: async (page) => {
      await createTrip(page);
      await page.getByRole("button", { name: "Nuova spesa" }).click();
      await expect(sheet(page, "Nuova spesa")).toBeVisible();
      await page.waitForTimeout(700);
    },
  },
  {
    name: "settlement sheet",
    open: async (page) => {
      await createTrip(page);
      await page.getByRole("button", { name: "Nuova spesa" }).click();
      const dialog = sheet(page, "Nuova spesa");
      await dialog.getByLabel("Cosa avete pagato?").fill("Cena");
      await dialog.getByLabel("Importo").fill("100");
      await dialog.getByRole("button", { name: "Salva la spesa" }).click();
      await expect(dialog).toBeHidden();
      await tab(page, "Saldi").click();
      await page.getByRole("button", { name: "Registra", exact: true }).first().click();
      await page.waitForTimeout(700);
    },
  },
  {
    name: "Viaggio",
    open: async (page) => {
      await createTrip(page);
      await tab(page, "Viaggio").click();
      await expect(page.getByLabel("Dal")).toBeVisible();
    },
  },
];

const overflowing = (page: Page) =>
  page.evaluate(() => {
    const roots = [document.documentElement, ...document.querySelectorAll<HTMLElement>("main, [role=dialog]")];
    return roots.filter((el) => el.scrollWidth > el.clientWidth).map((el) => `${el.tagName}[${el.getAttribute("role") ?? ""}] ${el.scrollWidth}>${el.clientWidth}`);
  });

const smallControls = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("input, select, textarea")]
      .filter((el) => el.getClientRects().length > 0 && !["checkbox", "radio", "hidden"].includes((el as HTMLInputElement).type))
      .map((el) => ({ id: el.id || el.getAttribute("aria-label") || el.tagName, size: parseFloat(getComputedStyle(el).fontSize) }))
      .filter((c) => c.size < 16),
  );

const dateBoxes = async (page: Page, from: string, to: string) => {
  const a = await page.locator(`#${from}`).boundingBox();
  const b = await page.locator(`#${to}`).boundingBox();
  return { a: a!, b: b! };
};

const intersect = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const screen of SCREENS) {
      test(`${screen.name}: no sideways scroll, no control under 16px`, async ({ page }) => {
        await screen.open(page);
        expect(await overflowing(page)).toEqual([]);
        expect(await smallControls(page)).toEqual([]);
      });
    }

    test("create trip: the Dal and Al fields do not overlap", async ({ page }) => {
      await openCreateForm(page);
      const { a, b } = await dateBoxes(page, "trip-from", "trip-to");
      expect(intersect(a, b)).toBe(false);
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
    });

    test("Viaggio: the Dal and Al fields do not overlap", async ({ page }) => {
      await createTrip(page);
      await tab(page, "Viaggio").click();
      const { a, b } = await dateBoxes(page, "edit-trip-from", "edit-trip-to");
      expect(intersect(a, b)).toBe(false);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
    });

    test("create trip: the button says what is missing and the list shrinks as the form is filled", async ({ page }) => {
      await openCreateForm(page);
      const create = page.getByRole("button", { name: "Crea il viaggio" });
      const hint = page.getByTestId("create-missing");
      await expect(create).toBeDisabled();
      await expect(hint).toContainText("Dai un nome al viaggio");
      await expect(hint).toContainText("Scrivi il tuo nome tra i partecipanti");

      await page.getByLabel("Nome del viaggio").fill("Sardegna 2026");
      await expect(hint).not.toContainText("Dai un nome al viaggio");

      await page.getByLabel("Il tuo nome").fill("Simone");
      await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
      await expect(hint).toHaveText("Aggiungi almeno un'altra persona");
      await expect(create).toBeDisabled();

      await page.getByLabel("Aggiungi un nome").fill("Sara");
      await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
      await expect(hint).toBeHidden();
      await expect(create).toBeEnabled();
    });
  });
}

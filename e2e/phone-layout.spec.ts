import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { activateCreatorCode, addExpense, createTrip, fillTripForm, openCreateForm, sheet, tab } from "./trip-flow.ts";

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
    name: "Saldi",
    open: async (page) => {
      await createTrip(page);
      await addExpense(page, { description: "Cena", amount: "100" });
      await tab(page, "Saldi").click();
      await expect(page.getByRole("button", { name: "Registra", exact: true }).first()).toBeVisible();
    },
  },
  {
    name: "expense detail",
    open: async (page) => {
      await createTrip(page);
      await addExpense(page, { description: "Cena", amount: "100" });
      await page.getByTestId("expense-row").filter({ hasText: "Cena" }).click();
      await expect(page.getByRole("button", { name: "Modifica", exact: true })).toBeVisible();
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

/**
 * Interactive elements whose real hit area is under 44 px either way (WCAG 2.5.5, iOS guidelines). The hit
 * area is measured the way a finger meets it: the run of points around the centre that land on the control
 * itself, so a padded or extended (pseudo-element) area counts and a bare 38 px pill does not. Links inside a
 * line of text are exempt, as in WCAG. Whole pixels are probed, so 43 stands for a 44 px box.
 */
const smallHitAreas = (page: Page) =>
  page.evaluate(() => {
    const TARGETS = "button, a[href], input:not([type=hidden]), select, textarea, summary, [role=tab], [role=button], [role=switch]";
    const owns = (el: Element, x: number, y: number) => {
      const hit = document.elementFromPoint(x, y);
      return hit !== null && (hit === el || el.contains(hit) || hit.closest("label")?.control === el);
    };
    const run = (el: Element, cx: number, cy: number, dx: number, dy: number) => {
      let n = 0;
      while (n < 60 && owns(el, cx + dx * (n + 1), cy + dy * (n + 1))) n++;
      return n;
    };
    return [...document.querySelectorAll<HTMLElement>(TARGETS)]
      .filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest("[inert], [aria-hidden=true]"))
      .filter((el) => !(el.tagName === "A" && el.closest("p, li") && getComputedStyle(el).display === "inline"))
      .map((el) => {
        el.scrollIntoView({ block: "center", inline: "center" });
        const r = el.getBoundingClientRect();
        const cx = Math.round(r.left + r.width / 2);
        const cy = Math.round(r.top + r.height / 2);
        if (!owns(el, cx, cy)) return null; // behind a sheet or off screen: not a target right now
        const width = run(el, cx, cy, -1, 0) + run(el, cx, cy, 1, 0) + 1;
        const height = run(el, cx, cy, 0, -1) + run(el, cx, cy, 0, 1) + 1;
        return { name: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 30) || el.id || el.tagName, width, height };
      })
      .filter((c) => c !== null && (c.width < 43 || c.height < 43));
  });

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

    for (const screen of SCREENS) {
      test(`${screen.name}: every control has a 44 px hit area`, async ({ page }) => {
        await screen.open(page);
        expect(await smallHitAreas(page)).toEqual([]);
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

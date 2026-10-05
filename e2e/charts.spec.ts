import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { sardegna, seedTrip, tripWithBooking } from "./seed-trip.ts";
import { applyTheme, THEMES } from "./themes.ts";
import { addExpense, createTrip, tab } from "./trip-flow.ts";

// SPEC.md §15 S7. Numbers come from the prototype's own code on the Sardegna seed (domain/charts/model.test.ts).

const openCharts = async (page: Page) => {
  await seedTrip(page, "Sardegna 2026", sardegna());
  await tab(page, "Grafici").click();
  await expect(page.getByTestId("grafici")).toBeVisible();
};
const readout = (page: Page, chart: string) => page.getByTestId(`chart-${chart}`).getByTestId("readout");

test("Sardegna: the charts show the prototype's numbers", async ({ page }) => {
  await openCharts(page);
  await expect(page.getByTestId("hero-total")).toHaveText("4565,18 €");
  await expect(page.getByTestId("per-day")).toHaveText("570,65 €");
  await expect(page.getByTestId("per-head-day")).toHaveText("95,11 €");
  await expect(page.getByTestId("chart-cat")).toContainText("Alloggio");
  await expect(page.getByTestId("chart-cat").locator("[data-mark]").first()).toHaveAccessibleName(/Alloggio: 1540,00\s€/);
  await expect(page.getByTestId("chart-rank").locator("[data-mark]").first()).toHaveAccessibleName(/Casa a Cala Gonone, 7 notti: 1540,00\s€/);
});

test("Sardegna: the bank chart ends exactly on the balances of Saldi", async ({ page }) => {
  await openCharts(page);
  await page.getByRole("button", { name: /Chi ha fatto da banca/ }).click();
  const overlay = page.getByRole("dialog", { name: "Chi ha fatto da banca" });
  await expect(overlay.getByTestId("bank-lede")).toContainText("Sara");
  const labels = overlay.locator("svg text.strong");
  for (const final of ["+69,11 €", "+521,21 €", "+87,61 €", "-302,42 €", "-375,51 €"]) {
    await expect(labels.filter({ hasText: final })).toHaveCount(1);
  }
  await page.getByRole("button", { name: "Indietro" }).click();
  await tab(page, "Saldi").click();
  await expect(page.getByTestId("balance-row").filter({ hasText: "Sara" })).toContainText("521,21");
  await expect(page.getByTestId("balance-row").filter({ hasText: "Chiara" })).toContainText("375,51");
});

test("a person's filter turns group charts into their share", async ({ page }) => {
  await openCharts(page);
  await page.getByRole("button", { name: "Giulia e Marco", exact: true }).click();
  await expect(page.getByTestId("hero-total")).toHaveText("1488,39 €");
  await expect(page.getByTestId("scope")).toContainText("parte di Giulia e Marco");
  await page.getByRole("button", { name: "Tutto il gruppo" }).click();
  await expect(page.getByTestId("hero-total")).toHaveText("4565,18 €");
});

test("the keyboard alone reads every chart", async ({ page }) => {
  await openCharts(page);
  // List charts: focusing a mark selects it, arrows move on; the readout row says what it is.
  const firstCat = page.getByTestId("chart-cat").locator("[data-mark]").first();
  await firstCat.focus();
  await expect(readout(page, "cat")).toContainText("Alloggio");
  await page.keyboard.press("ArrowDown");
  await expect(readout(page, "cat")).toContainText("Trasporti");

  const firstRank = page.getByTestId("chart-rank").locator("[data-mark]").first();
  await firstRank.focus();
  await expect(readout(page, "rank")).toContainText("1540,00");
  await page.keyboard.press("ArrowDown");
  await expect(readout(page, "rank")).not.toContainText("1540,00");

  await page.getByTestId("chart-pvd").locator("[data-mark]").first().focus();
  await expect(readout(page, "pvd")).toContainText("Simone");
  await expect(readout(page, "pvd")).toContainText(/ha anticipato/i);

  // Time charts: one slider each; arrows step, Home and End jump.
  for (const chart of ["cum", "day"]) {
    const slider = page.getByTestId(`chart-${chart}`).getByRole("slider");
    await slider.focus();
    const first = await readout(page, chart).innerText();
    await page.keyboard.press("Home");
    const home = await readout(page, chart).innerText();
    await page.keyboard.press("ArrowRight");
    const next = await readout(page, chart).innerText();
    expect(home).not.toBe(next);
    expect(first.length).toBeGreaterThan(0);
  }
  await expect(readout(page, "day")).toContainText("Giorno");
});

test("the keyboard reads the two chart overlays too", async ({ page }) => {
  await openCharts(page);
  await page.getByRole("button", { name: /Persona per categoria/ }).click();
  const heat = page.getByTestId("heat");
  await heat.locator("[data-mark]").first().focus();
  await expect(page.getByRole("dialog").getByTestId("readout")).toContainText("Simone");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog").getByTestId("readout")).toContainText("Sara");
  await page.getByRole("button", { name: "Indietro" }).click();

  await page.getByRole("button", { name: /Chi ha fatto da banca/ }).click();
  const slider = page.getByRole("dialog").getByRole("slider");
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(page.getByRole("dialog").getByTestId("readout")).toContainText("Inizio del viaggio");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog").getByTestId("readout")).toContainText(/dopo:/i);
});

test.describe("touch", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("a tap reads a value into the fixed row, no hover needed, and a tap outside clears it", async ({ page }) => {
    await openCharts(page);
    await page.getByTestId("chart-cat").locator("[data-mark]").nth(1).tap();
    await expect(readout(page, "cat")).toContainText("Trasporti");
    await page.getByTestId("chart-day").getByRole("slider").tap({ position: { x: 80, y: 100 } });
    await expect(readout(page, "day")).toContainText(/giu/);
    await page.getByTestId("scope").tap();
    await expect(readout(page, "cat")).toContainText("Tocca un elemento");
  });
});

test("an undated trip spans first to last expense, with no projection and no today", async ({ page }) => {
  await createTrip(page, "Weekend");
  await addExpense(page, { description: "Cena", amount: "60,00" });
  await tab(page, "Grafici").click();
  const hero = page.getByTestId("chart-cum");
  await expect(hero.getByTestId("hero-total")).toHaveText("60,00 €");
  await expect(hero).not.toContainText("≈");
  await expect(hero).not.toContainText("a fine viaggio");
  await expect(hero.locator("svg text.today")).toHaveCount(0);
  await expect(hero.locator("svg .key-dash")).toHaveCount(0);
});

test("an expense dated before the start sits in Prima del viaggio and out of the per-day averages", async ({ page }) => {
  await seedTrip(page, "Estate", tripWithBooking());
  await tab(page, "Grafici").click();
  await expect(page.getByTestId("hero-total")).toHaveText("530,00 €");
  // 30,00 € over the 3 trip days; the 500,00 € booking is not spread over them.
  await expect(page.getByTestId("per-day")).toHaveText("10,00 €");
  const days = page.getByTestId("chart-day");
  await expect(days.locator("svg[aria-label='Per giorno']")).toContainText("Prima");
  await days.getByRole("button", { name: "Numeri" }).click();
  await expect(days.getByTestId("numbers")).toContainText("Prima del viaggio");
  await expect(days.getByTestId("numbers").locator("tr").filter({ hasText: "Prima del viaggio" })).toContainText("500,00");
});

test("Motivi adds textures to the standard categories; custom ones always have one", async ({ page }) => {
  await openCharts(page);
  const legend = page.getByTestId("days-legend");
  await expect(legend.locator("span", { hasText: "Aperitivi" }).locator(".sw")).toHaveClass(/tx-/);
  await expect(legend.locator("span", { hasText: "Ristoranti" }).locator(".sw")).not.toHaveClass(/tx-/);
  await page.getByRole("switch", { name: "Motivi" }).click();
  await expect(legend.locator("span", { hasText: "Ristoranti" }).locator(".sw")).toHaveClass(/tx-b/);
  await expect(legend.locator("span", { hasText: "Aperitivi" }).locator(".sw")).toHaveClass(/tx-e/);
  await page.reload();
  await tab(page, "Grafici").click();
  await expect(page.getByRole("switch", { name: "Motivi" })).toHaveAttribute("aria-checked", "true");
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("the column widens to 760 px and receipts go two per row, the hero spanning both", async ({ page }) => {
    await openCharts(page);
    const column = await page.locator(".app-col").boundingBox();
    expect(Math.round(column!.width)).toBe(760);
    const hero = (await page.getByTestId("chart-cum").boundingBox())!;
    const cat = (await page.getByTestId("chart-cat").boundingBox())!;
    const day = (await page.getByTestId("chart-day").boundingBox())!;
    expect(day.y).toBeLessThan(cat.y + cat.height);
    expect(Math.abs(day.y - cat.y)).toBeLessThan(2);
    expect(day.x).toBeGreaterThan(cat.x + cat.width - 2);
    expect(hero.width).toBeGreaterThan(cat.width * 1.8);
  });
});

test.describe("accessibility", () => {
  for (const theme of THEMES) {
    test(`Grafici with the Sardegna data and both overlays have no axe violations, ${theme} theme`, async ({ page }) => {
      await openCharts(page);
      await applyTheme(page, theme, "system");
      const scan = async () => {
        const { violations } = await new AxeBuilder({ page }).analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
      };
      await page.waitForTimeout(1500);
      await scan();
      await page.getByRole("button", { name: "Numeri" }).first().click();
      await scan();
      await page.getByRole("button", { name: /Persona per categoria/ }).click();
      await page.waitForTimeout(500);
      await scan();
      await page.getByRole("button", { name: "Indietro" }).click();
      await page.getByRole("button", { name: /Chi ha fatto da banca/ }).click();
      await page.waitForTimeout(500);
      await scan();
    });
  }
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { applyTheme, THEMES } from "./themes.ts";
import { addExpense, createTrip, sheet, tab } from "./trip-flow.ts";

// SPEC.md §7.6 item 8: "Condividi riepilogo" shares the settle-up recap, or copies it, or shows it to copy by hand.

type Mode = "share" | "cancel" | "clipboard" | "nothing";

/** Stubs what the browser would offer, before any page script runs; the calls land in `window.__recap`. */
const stubBrowser = (page: Page, mode: Mode) =>
  page.addInitScript((m) => {
    const calls: { shared: unknown[]; copied: string[] } = { shared: [], copied: [] };
    (window as unknown as { __recap: typeof calls }).__recap = calls;
    const share = async (data: unknown) => {
      calls.shared.push(data);
      if (m === "cancel") throw new DOMException("cancelled", "AbortError");
    };
    Object.defineProperty(navigator, "share", { value: m === "share" || m === "cancel" ? share : undefined, configurable: true });
    const writeText = async (text: string) => {
      if (m === "nothing") throw new DOMException("denied", "NotAllowedError");
      calls.copied.push(text);
    };
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  }, mode);

const recapCalls = (page: Page) => page.evaluate(() => (window as unknown as { __recap: { shared: { title: string; text: string }[]; copied: string[] } }).__recap);

async function openSaldi(page: Page) {
  await createTrip(page, "Sardegna 2026", ["Simone", "Sara", "Luca"]);
  await addExpense(page, { description: "Cena a Su Gologone", amount: "90,00", payer: "Sara" });
  await tab(page, "Saldi").click();
  await expect(page.getByTestId("suggestion")).toHaveCount(2);
  await expect(page.getByRole("status")).toBeHidden({ timeout: 10_000 });
}

const shareButton = (page: Page) => page.getByRole("button", { name: "Condividi riepilogo" });

test("shares the recap through the system share sheet", async ({ page, baseURL }) => {
  await stubBrowser(page, "share");
  await openSaldi(page);
  await shareButton(page).click();
  await expect.poll(async () => (await recapCalls(page)).shared.length).toBe(1);
  const [call] = (await recapCalls(page)).shared;
  expect(call?.title).toBe("Sardegna 2026");
  const lines = call?.text.split("\n") ?? [];
  expect(lines[0]).toBe("Quits · Sardegna 2026");
  expect(lines[1]).toBe("Pagamenti per andare pari:");
  expect(lines.filter((l) => l.startsWith("• "))).toHaveLength(2);
  expect(lines.filter((l) => l.startsWith("• ")).every((l) => l.includes(" → Sara: 30,00"))).toBe(true);
  expect(lines.at(-2)).toMatch(/^Totale del viaggio: 90,00/);
  expect(lines.at(-1)).toMatch(new RegExp(`^Apri il viaggio: ${baseURL}/v/#[\\w-]{22}$`));
  await expect(page.getByText("Riepilogo copiato")).toBeHidden();
});

test("closing the share sheet does nothing else", async ({ page }) => {
  await stubBrowser(page, "cancel");
  await openSaldi(page);
  await shareButton(page).click();
  await expect.poll(async () => (await recapCalls(page)).shared.length).toBe(1);
  await expect(page.getByText("Riepilogo copiato")).toBeHidden();
  expect((await recapCalls(page)).copied).toHaveLength(0);
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("copies the recap when there is no Web Share", async ({ page }) => {
  await stubBrowser(page, "clipboard");
  await openSaldi(page);
  await shareButton(page).click();
  await expect(page.getByText("Riepilogo copiato")).toBeVisible();
  const [copied] = (await recapCalls(page)).copied;
  expect(copied).toContain("Pagamenti per andare pari:");
});

test("shows the text to copy by hand when the clipboard fails too", async ({ page }) => {
  await stubBrowser(page, "nothing");
  await openSaldi(page);
  await shareButton(page).click();
  const dialog = sheet(page, "Riepilogo");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Testo del riepilogo")).toHaveValue(/Quits · Sardegna 2026\nPagamenti per andare pari:/);
  await expect(dialog.getByLabel("Testo del riepilogo")).toHaveAttribute("readonly", "");
});

test("works offline and on a closed trip", async ({ page, context }) => {
  await stubBrowser(page, "clipboard");
  await openSaldi(page);
  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "Chiudi il viaggio" }).click();
  // The trip is uneven: closing asks first.
  await page.getByRole("button", { name: "Chiudi il viaggio" }).click();
  await expect(page.getByTestId("closed-bar")).toBeVisible();
  await tab(page, "Saldi").click();
  await context.setOffline(true);
  await shareButton(page).click();
  await expect(page.getByText("Riepilogo copiato")).toBeVisible();
});

test.describe("at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const theme of THEMES) {
    test(`is accessible in the ${theme} theme`, async ({ page }) => {
      await stubBrowser(page, "nothing");
      await openSaldi(page);
      await applyTheme(page, theme, "system");
      await expect(shareButton(page)).toBeVisible();
      await shareButton(page).scrollIntoViewIfNeeded();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      if (process.env.RECAP_SHOTS) {
        mkdirSync(process.env.RECAP_SHOTS, { recursive: true });
        await page.screenshot({ path: `${process.env.RECAP_SHOTS}/saldi-${theme}.png` });
      }
      await shareButton(page).click();
      await expect(sheet(page, "Riepilogo")).toBeVisible();
      await page.waitForTimeout(700);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      if (process.env.RECAP_SHOTS) await page.screenshot({ path: `${process.env.RECAP_SHOTS}/sheet-${theme}.png` });
    });
  }
});

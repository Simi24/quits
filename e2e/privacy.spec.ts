import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { blockExternalRequests } from "./offline-guard.ts";
import { applyTheme, THEMES } from "./themes.ts";
import { createTrip, tab } from "./trip-flow.ts";

// SPEC.md §10.2: the privacy page, IT and EN following the device language.
const LANGUAGES = [
  { locale: "it-IT", h1: "Privacy", stored: "Cosa viene salvato", back: "Torna all'inizio", howLong: "Per quanto tempo" },
  { locale: "en-US", h1: "Privacy", stored: "What is stored", back: "Back to start", howLong: "For how long" },
] as const;

for (const language of LANGUAGES) {
  test.describe(`privacy page, ${language.locale}`, () => {
    test.use({ locale: language.locale });

    test("follows the device language and states the facts of SPEC.md §10.2", async ({ page, baseURL }) => {
      const blocked = await blockExternalRequests(page, baseURL as string);

      await page.goto("/privacy");

      await expect(page.getByRole("heading", { level: 1, name: language.h1 })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: language.stored })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: language.howLong })).toBeVisible();
      await expect(page.getByRole("link", { name: language.back })).toHaveAttribute("href", "/");
      await expect(page.getByRole("link", { name: "quits@simonepetta.com" })).toHaveAttribute("href", "mailto:quits@simonepetta.com");
      await expect(page.getByRole("link", { name: /Cloudflare/ })).toHaveAttribute("href", "https://www.cloudflare.com/privacypolicy/");
      expect(blocked).toEqual([]);
    });

    for (const theme of THEMES) {
      test(`has no axe violations, ${theme} theme`, async ({ page }) => {
        await page.goto("/privacy");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await applyTheme(page, theme, "system");

        const { violations } = await new AxeBuilder({ page }).analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
      });
    }
  });
}

test("the language selector on the page switches it and the choice stays", async ({ page }) => {
  await page.goto("/privacy");
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "What is stored" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { level: 2, name: "What is stored" })).toBeVisible();
});

test("the landing footer leads to the privacy page and back", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Informazioni su Quits").getByRole("link", { name: "Privacy" }).click();

  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 2, name: "Cosa viene salvato" })).toBeVisible();
  await page.getByRole("link", { name: "Torna all'inizio" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
});

test("the trip footer leads to the privacy page", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Viaggio").click();

  await page.getByLabel("Informazioni su Quits").getByRole("link", { name: "Privacy" }).click();

  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
});

test("trip pages are noindex, the landing and the privacy page are not", async ({ request }) => {
  for (const path of ["/v", "/v/", "/v/anything"]) {
    const response = await request.get(path);
    expect(response.headers()["x-robots-tag"], path).toContain("noindex");
  }
  for (const path of ["/", "/privacy"]) {
    const response = await request.get(path);
    expect(response.headers()["x-robots-tag"], path).toBeUndefined();
  }
});

test("robots.txt lets the landing be indexed and keeps crawlers off the API", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();

  expect(body).toContain("Allow: /");
  expect(body).toContain("Disallow: /api/");
  expect(body).not.toContain("Disallow: /v");
});

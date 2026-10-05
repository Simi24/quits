import { expect, test } from "@playwright/test";
import { blockExternalRequests } from "./offline-guard.ts";

test("the empty app renders, with no request leaving for another origin", async ({ page, baseURL }) => {
  const blocked = await blockExternalRequests(page, baseURL as string);

  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
  expect(blocked).toEqual([]);
});

test("the self-hosted fonts load", async ({ page }) => {
  await page.goto("/");
  // Fonts load when text that uses them is on the page, and the landing renders after IndexedDB answers.
  await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();

  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replaceAll('"', ""));
  });

  expect(loaded).toEqual(expect.arrayContaining(["Bagel Fat One", "Onest"]));
});

test("an unknown path falls back to the app", async ({ page }) => {
  await page.goto("/v/");

  await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
});

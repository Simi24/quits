import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { sardegna, seedTrip } from "./seed-trip.ts";
import { serveDist } from "./static-dist.ts";
import type { DistServer } from "./static-dist.ts";

// SPEC.md §10.1 and §15 S9: the Cloudflare Web Analytics beacon is on the landing only, and only when the
// build was given a token. Each group is served from its own build, so the token is a real build-time value.
const FAKE_TOKEN = "e2e-fake-beacon-token";
const BEACON_HOST = "static.cloudflareinsights.com";
const BEACON = `script[src*="${BEACON_HOST}"]`;

const build = (token: string, outDir: string) =>
  execFileSync("npx", ["vite", "build", "--outDir", outDir, "--emptyOutDir"], {
    env: { ...process.env, VITE_CF_BEACON_TOKEN: token },
    stdio: "ignore",
  });

/** No request reaches Cloudflare: the beacon URL is aborted, and the test only looks at the DOM. */
const abortBeacon = (page: Page) => page.route(`**/${BEACON_HOST}/**`, (route) => route.abort());

const beaconCount = (page: Page) => page.locator(BEACON).count();

test.describe("with a token at build", () => {
  let dir: string;
  let dist: DistServer;

  test.beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "quits-beacon-"));
    build(FAKE_TOKEN, dir);
    dist = await serveDist(dir);
  });
  test.afterAll(async () => {
    await dist.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test("the landing carries the beacon with the token", async ({ page }) => {
    await abortBeacon(page);
    await page.goto(`${dist.url}/`);

    await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
    await expect(page.locator(BEACON)).toHaveCount(1);
    await expect(page.locator(BEACON)).toHaveAttribute("data-cf-beacon", JSON.stringify({ token: FAKE_TOKEN }));
  });

  test("a trip page never has the beacon", async ({ page }) => {
    await abortBeacon(page);
    await page.goto(`${dist.url}/v/`);

    await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
    expect(await beaconCount(page)).toBe(0);
  });

  test("the privacy page has no beacon", async ({ page }) => {
    await abortBeacon(page);
    await page.goto(`${dist.url}/privacy`);

    await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
    expect(await beaconCount(page)).toBe(0);
  });

  test("opening a trip from the landing removes the beacon, and the landing puts it back", async ({ browser }) => {
    const context = await browser.newContext({ baseURL: dist.url, locale: "it-IT" });
    const page = await context.newPage();
    await abortBeacon(page);
    await seedTrip(page, "Sardegna 2026", sardegna());
    await page.getByRole("button", { name: "Torna all'inizio" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
    await expect(page.locator(BEACON)).toHaveCount(1);

    await page.getByRole("button", { name: "Sardegna 2026" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Sardegna 2026" })).toBeVisible();
    expect(await beaconCount(page)).toBe(0);
    await context.close();
  });

  test("the service worker never caches the beacon", async ({ page }) => {
    await abortBeacon(page);
    await page.goto(`${dist.url}/`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();

    const cached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) urls.push(request.url);
      return urls;
    });
    expect(cached.length).toBeGreaterThan(0);
    expect(cached.filter((url) => url.includes("cloudflareinsights"))).toEqual([]);
  });
});

test.describe("without a token at build", () => {
  let dir: string;
  let dist: DistServer;

  test.beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "quits-nobeacon-"));
    build("", dir);
    dist = await serveDist(dir);
  });
  test.afterAll(async () => {
    await dist.close();
    rmSync(dir, { recursive: true, force: true });
  });

  for (const path of ["/", "/v/", "/privacy"]) {
    test(`${path} has no beacon and makes no request to Cloudflare Web Analytics`, async ({ page }) => {
      const requested: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes(BEACON_HOST)) requested.push(request.url());
      });
      await page.goto(`${dist.url}${path}`);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

      expect(await beaconCount(page)).toBe(0);
      expect(requested).toEqual([]);
    });
  }
});

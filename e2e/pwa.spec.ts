import AxeBuilder from "@axe-core/playwright";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect, test } from "@playwright/test";
import type { Browser, BrowserContext, Cookie, Page } from "@playwright/test";
import { deviceId, outboxOf, readStore, tripMetas } from "./idb.ts";
import { newDevice } from "./devices.ts";
import { sardegna, seedTrip } from "./seed-trip.ts";
import { serveDist } from "./static-dist.ts";
import { applyTheme, THEMES } from "./themes.ts";
import { addExpense, createTrip, joinTrip, tab } from "./trip-flow.ts";

// SPEC.md §15 S8: the installed app, several trips on one device, Background Sync, updates.

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0";

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });
const swReady = (page: Page) => page.evaluate(async () => void (await navigator.serviceWorker.ready));
const START_URL = "/v/?source=pwa";

/** Reloading comes back to the trip the app was left on, so a second trip is made from the landing. */
const toLanding = async (page: Page) => {
  await page.getByRole("button", { name: "Torna all'inizio" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "I tuoi viaggi su questo dispositivo" })).toBeVisible();
  // The device remembers the landing in IndexedDB a moment after it shows.
  await expect.poll(async () => (await readStore<{ lastTripId: string | null }>(page, "device"))[0]?.lastTripId).toBeNull();
};

const bridgeOf = async (context: BrowserContext) => (await context.cookies()).filter((cookie) => cookie.name === "quits_bridge");

/** The installed iOS app: Safari's cookies, none of its IndexedDB. */
const installedIphoneApp = async (browser: Browser, baseURL: string, cookies: Cookie[]) => {
  const context = await browser.newContext({ baseURL, locale: "it-IT", userAgent: IPHONE_SAFARI });
  await context.addCookies(cookies);
  return { context, page: await context.newPage() };
};

test.describe("the cookie bridge, on an iPhone", () => {
  test.use({ userAgent: IPHONE_SAFARI });

  test("a context with empty storage but the bridge cookie restores every trip it lists, with name and device id", async ({ page, context, browser, baseURL }) => {
    await createTrip(page, "Sardegna 2026", ["Simone", "Sara", "Luca"]);
    await toLanding(page);
    await createTrip(page, "Toscana", ["Simone", "Anna"]);
    const originalDevice = await deviceId(page);
    const bridge = await bridgeOf(context);
    expect(bridge).toHaveLength(1);
    expect(bridge[0]).toMatchObject({ path: "/v/", secure: true, sameSite: "Lax" });

    const installed = await installedIphoneApp(browser, baseURL as string, bridge);
    await installed.page.goto(START_URL);

    await expect(heading(installed.page, "Toscana")).toBeVisible();
    await expect(installed.page.getByRole("button", { name: "Sei Simone" })).toBeVisible();
    expect(await deviceId(installed.page)).toBe(originalDevice);

    await installed.page.getByRole("button", { name: "Torna all'inizio" }).click();
    await installed.page.getByRole("button", { name: /Sardegna 2026/ }).click();
    await expect(heading(installed.page, "Sardegna 2026")).toBeVisible();
    await expect(installed.page.getByRole("button", { name: "Sei Simone" })).toBeVisible();
    await installed.context.close();
  });

  test("the bridge holds the ten most recent trips, and never a trip with no link", async ({ page, context }) => {
    await seedTrip(page, "Sardegna 2026", sardegna());
    await toLanding(page);
    await createTrip(page, "Con il link", ["Simone", "Sara"]);
    const [cookie] = await bridgeOf(context);
    const decoded = JSON.parse(decodeURIComponent(cookie?.value ?? "")) as { t: string[][] };
    expect(decoded.t).toHaveLength(1);
    expect(cookie?.value.length).toBeLessThan(4000);
  });

  test("a start at the landing, where the bridge cannot be read, leaves it as it is", async ({ page, context, browser, baseURL }) => {
    await createTrip(page, "Sardegna 2026", ["Simone", "Sara"]);
    const bridge = await bridgeOf(context);

    const installed = await installedIphoneApp(browser, baseURL as string, bridge);
    await installed.page.goto("/");
    await expect(installed.page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
    await installed.page.waitForTimeout(300);
    expect((await bridgeOf(installed.context))[0]?.value).toBe(bridge[0]?.value);

    await installed.page.goto(START_URL);
    await expect(heading(installed.page, "Sardegna 2026")).toBeVisible();
    await installed.context.close();
  });
});

test("off iOS the token stays out of cookies: no bridge is written", async ({ page, context }) => {
  await createTrip(page);
  await expect(page.getByRole("button", { name: "Sei Simone" })).toBeVisible();
  await page.waitForTimeout(300);
  expect(await bridgeOf(context)).toEqual([]);
});

// Chromium switches Background Sync off in an incognito-like context, which is what a plain Playwright context
// is: this test runs in a persistent profile, like a real browser.
test("Background Sync is registered after a change, and a wake-up with the app closed sends the queue", async ({ baseURL }) => {
  const profile = mkdtempSync(join(tmpdir(), "quits-profile-"));
  const context = await chromium.launchPersistentContext(profile, { baseURL, locale: "it-IT", channel: "chromium" });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await createTrip(page);
    await swReady(page);
    await context.setOffline(true);
    await addExpense(page, { description: "Cena", amount: "60,00" });

    const tags = await page.evaluate(async () => {
      const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & { sync: { getTags: () => Promise<string[]> } };
      return registration.sync.getTags();
    });
    expect(tags).toContain("outbox");
    const [meta] = await tripMetas(page);
    expect(await outboxOf(page, meta?.tripId as string)).toHaveLength(1);

    // The app is closed: the page leaves the trip for a screen that does not sync, and the browser wakes the worker.
    await page.goto("/privacy");
    await context.setOffline(false);
    const cdp = await context.newCDPSession(page);
    const origin = new URL(page.url()).origin;
    const registration = new Promise<string>((resolve) => {
      cdp.on("ServiceWorker.workerRegistrationUpdated", ({ registrations }) => {
        const found = registrations.find((r) => r.scopeURL.startsWith(origin));
        if (found) resolve(found.registrationId);
      });
    });
    await cdp.send("ServiceWorker.enable");
    await cdp.send("ServiceWorker.dispatchSyncEvent", { origin, registrationId: await registration, tag: "outbox", lastChance: false });

    await expect.poll(async () => (await outboxOf(page, meta?.tripId as string)).length, { timeout: 15_000 }).toBe(0);
  } finally {
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  }
});

test("opening a second trip never touches the first one's identity or queue", async ({ page, context, browser, baseURL }) => {
  // The first trip has a link and a change made offline, still waiting to go out.
  await createTrip(page, "Sardegna 2026", ["Simone", "Sara"]);
  await context.setOffline(true);
  await addExpense(page, { description: "Cena", amount: "60,00" });
  await toLanding(page);
  await context.setOffline(false);
  const [first] = await tripMetas(page);
  const queued = await outboxOf(page, first?.tripId as string);
  expect(queued).toHaveLength(1);

  const host = await newDevice(browser, baseURL as string);
  const link = await createTrip(host.page, "Secondo viaggio", ["Anna", "Bruno"]);
  await joinTrip(page, link, "Secondo viaggio", "Bruno");

  const metas = await tripMetas(page);
  expect(metas).toHaveLength(2);
  expect(metas.find((m) => m.tripId === first?.tripId)).toEqual(first);
  expect(await outboxOf(page, first?.tripId as string)).toEqual(queued);
  const second = metas.find((m) => m.tripId !== first?.tripId);
  expect(second?.meId).not.toBeNull();
  expect(second?.token).not.toBe(first?.token);
  expect(await outboxOf(page, second?.tripId as string)).toHaveLength(0);
  await host.context.close();
});

test("started from start_url, the app opens the most recently used trip", async ({ page }) => {
  await createTrip(page, "Sardegna 2026", ["Simone", "Sara"]);
  await toLanding(page);
  await createTrip(page, "Toscana", ["Simone", "Anna"]);
  // Left on the landing: a plain reload would stay there, the installed app opens the most recent trip.
  await toLanding(page);

  await page.goto(START_URL);
  await expect(heading(page, "Toscana")).toBeVisible();

  // "I tuoi viaggi" leads to the landing; opening the other trip makes it the most recent.
  await page.getByRole("button", { name: "Torna all'inizio" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "I tuoi viaggi su questo dispositivo" })).toBeVisible();
  await page.getByRole("button", { name: /Sardegna 2026/ }).click();
  await expect(heading(page, "Sardegna 2026")).toBeVisible();

  await page.goto(START_URL);
  await expect(heading(page, "Sardegna 2026")).toBeVisible();
});

test("started from start_url with no network after the first load, the app still opens", async ({ page, context }) => {
  await createTrip(page);
  await addExpense(page, { description: "Cena", amount: "60,00" });
  await swReady(page);
  await context.setOffline(true);

  await page.goto(START_URL);

  await expect(heading(page, "Sardegna 2026")).toBeVisible();
  await expect(page.getByTestId("expense-row")).toContainText("Cena");
});

test("a new build triggers the update prompt, and accepting it loads the new version", async ({ page }) => {
  const dist = await serveDist();
  try {
    await page.goto(dist.url);
    await swReady(page);
    await expect(page.getByText("Nuova versione disponibile")).toBeHidden();

    dist.publishNewBuild();
    await page.evaluate(async () => void (await (await navigator.serviceWorker.getRegistration())?.update()));
    const banner = page.getByRole("status").filter({ hasText: "Nuova versione disponibile" });
    await expect(banner).toBeVisible();
    await page.waitForTimeout(700); // the banner is still sliding in: axe would read colours mid-fade

    for (const theme of THEMES) {
      await applyTheme(page, theme, "system");
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${theme}`).toEqual([]);
    }

    await banner.getByRole("button", { name: "Aggiorna" }).click();
    await expect(banner).toBeHidden();
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting === null)).toBe(true);
  } finally {
    await dist.close();
  }
});

test("persist() is asked for after joining a trip", async ({ page, browser, baseURL }) => {
  const host = await newDevice(browser, baseURL as string);
  const link = await createTrip(host.page, "Dolomiti", ["Anna", "Bruno"]);
  await page.addInitScript(() => {
    (window as unknown as { persistCalls: number }).persistCalls = 0;
    navigator.storage.persist = async () => {
      (window as unknown as { persistCalls: number }).persistCalls += 1;
      return true;
    };
  });

  await joinTrip(page, link, "Dolomiti", "Bruno");

  expect(await page.evaluate(() => (window as unknown as { persistCalls: number }).persistCalls)).toBeGreaterThan(0);
  await host.context.close();
});

test("'Apri o incolla un link di viaggio' opens a trip from a full link or a bare token, and says when it cannot", async ({ page, browser, baseURL }) => {
  const host = await newDevice(browser, baseURL as string);
  const link = await createTrip(host.page, "Dolomiti", ["Anna", "Bruno"]);
  const token = link.split("#")[1] as string;

  await page.goto("/");
  const field = page.getByLabel("Apri o incolla un link di viaggio");
  await field.fill("ciao a tutti");
  await page.getByRole("button", { name: "Apri", exact: true }).click();
  await expect(page.getByText("Questo non sembra un link di Quits")).toBeVisible();

  await field.fill(` ${token} `);
  await page.getByRole("button", { name: "Apri", exact: true }).click();
  await page.getByRole("button", { name: "Bruno", exact: true }).click();
  await expect(heading(page, "Dolomiti")).toBeVisible();

  await page.getByRole("button", { name: "Torna all'inizio" }).click();
  await field.fill(link);
  await page.getByRole("button", { name: "Apri", exact: true }).click();
  await expect(heading(page, "Dolomiti")).toBeVisible();
  await host.context.close();
});

test("an in-app browser gets the banner on trip open, with a button that copies the link", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, locale: "it-IT", userAgent: INSTAGRAM, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  const link = await createTrip(page);

  const banner = page.getByTestId("in-app-banner");
  await expect(banner).toContainText("Apri il link in Safari o in Chrome");
  await banner.getByRole("button", { name: "Copia link" }).click();
  await expect(banner).toContainText("Link copiato");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
  await context.close();
});

test("a normal browser gets no in-app banner", async ({ page }) => {
  await createTrip(page);
  await expect(page.getByTestId("in-app-banner")).toHaveCount(0);
});

test.describe("on an iPhone in Safari", () => {
  test.use({ userAgent: IPHONE_SAFARI, hasTouch: true, viewport: { width: 390, height: 844 } });

  test("the install card in Viaggio opens the Share and Add to Home Screen steps, and passes axe in both themes", async ({ page }) => {
    await createTrip(page);
    await tab(page, "Viaggio").click();
    const card = page.getByRole("region", { name: "Tieni Quits sulla schermata Home" });
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "Come si fa" }).click();
    const steps = page.getByRole("dialog", { name: "Aggiungi alla schermata Home" });
    await expect(steps).toContainText("Tocca Condividi");
    await expect(steps).toContainText("Aggiungi alla schermata Home");
    await page.waitForTimeout(700); // the sheet is still rising: axe would read colours mid-fade
    for (const theme of THEMES) {
      await applyTheme(page, theme, "system");
      expect((await new AxeBuilder({ page }).analyze()).violations, `${theme}`).toEqual([]);
    }
    await steps.getByRole("button", { name: "Ho capito" }).click();
    await expect(steps).toBeHidden();

    for (const theme of THEMES) {
      await applyTheme(page, theme, "system");
      expect((await new AxeBuilder({ page }).analyze()).violations, `card, ${theme}`).toEqual([]);
    }
  });

  test("with changes waiting the card asks to wait instead of offering installation", async ({ page, context }) => {
    await createTrip(page);
    await context.setOffline(true);
    await addExpense(page, { description: "Cena", amount: "60,00" });
    await tab(page, "Viaggio").click();

    const card = page.getByRole("region", { name: "Tieni Quits sulla schermata Home" });
    await expect(card).toContainText("aspetta che le modifiche in attesa siano inviate");
    await expect(card.getByRole("button", { name: "Come si fa" })).toHaveCount(0);

    await context.setOffline(false);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(card.getByRole("button", { name: "Come si fa" })).toBeVisible();
  });

  test("with changes waiting in another trip on the device, the card asks to wait too", async ({ page, context }) => {
    await createTrip(page, "Sardegna 2026", ["Simone", "Sara"]);
    await toLanding(page);
    await createTrip(page, "Toscana", ["Simone", "Anna"]);
    await toLanding(page);
    await page.getByRole("button", { name: /Sardegna 2026/ }).click();
    await context.setOffline(true);
    await addExpense(page, { description: "Cena", amount: "60,00" });

    await toLanding(page);
    await page.getByRole("button", { name: /Toscana/ }).click();
    await tab(page, "Viaggio").click();
    const card = page.getByRole("region", { name: "Tieni Quits sulla schermata Home" });
    await expect(card).toContainText("aspetta che le modifiche in attesa siano inviate");
    await expect(card.getByRole("button", { name: "Come si fa" })).toHaveCount(0);
  });

  test("the one-time hint comes after the third expense, once", async ({ page }) => {
    await createTrip(page);
    const hint = page.getByText("Puoi tenere Quits sulla schermata Home.");
    await addExpense(page, { description: "Uno", amount: "10,00" });
    await addExpense(page, { description: "Due", amount: "10,00" });
    await expect(hint).toBeHidden();

    await addExpense(page, { description: "Tre", amount: "10,00" });
    await expect(hint).toBeVisible();
    await expect(hint).toBeHidden({ timeout: 12_000 });

    await addExpense(page, { description: "Quattro", amount: "10,00" });
    await page.waitForTimeout(800);
    await expect(hint).toBeHidden();
  });

  test("'Non ora' dismisses the card for good on this device", async ({ page }) => {
    await createTrip(page);
    await tab(page, "Viaggio").click();
    const card = page.getByRole("region", { name: "Tieni Quits sulla schermata Home" });
    await card.getByRole("button", { name: "Non ora" }).click();
    await expect(card).toBeHidden();
    await expect.poll(async () => (await readStore<{ installDismissed: boolean }>(page, "device"))[0]?.installDismissed).toBe(true);

    await page.goto(START_URL);
    await tab(page, "Viaggio").click();
    await expect(page.getByRole("button", { name: "Copia il link" })).toBeVisible();
    await expect(card).toHaveCount(0);
  });
});

test("where the browser offers its own install prompt, the card installs through it", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Viaggio").click();
  await expect(page.getByRole("region", { name: "Tieni Quits sulla schermata Home" })).toHaveCount(0);

  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: async () => void ((window as unknown as { prompted: boolean }).prompted = true),
    });
    window.dispatchEvent(event);
  });
  const card = page.getByRole("region", { name: "Tieni Quits sulla schermata Home" });
  await card.getByRole("button", { name: "Installa" }).click();

  expect(await page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(true);
  await expect(card).toBeHidden();
});

test("the manifest starts at /v/?source=pwa and carries the = icon and the paper colours", async ({ page }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await page.request.get(href as string)).json();
  expect(manifest).toMatchObject({ start_url: "/v/?source=pwa", display: "standalone", theme_color: "#FBEBDD", background_color: "#FBEBDD" });
  const sizes = manifest.icons.map((icon: { sizes: string; purpose: string; type: string }) => `${icon.type}:${icon.sizes}:${icon.purpose}`);
  expect(sizes).toEqual(expect.arrayContaining(["image/svg+xml:any:any", "image/png:192x192:maskable", "image/png:512x512:maskable"]));
  for (const icon of manifest.icons) expect((await page.request.get(icon.src)).ok()).toBe(true);
});

test("a newer version of the database is never blocked by a tab that has the app open", async ({ page }) => {
  await createTrip(page);

  // What a later build's upgrade does while this tab (or the service worker) still holds the old connection.
  const outcome = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const open = indexedDB.open("quits", 99);
        open.onsuccess = () => {
          open.result.close();
          resolve("upgraded");
        };
        open.onerror = () => resolve(`error: ${open.error?.message}`);
        setTimeout(() => resolve("blocked"), 3000);
      }),
  );

  expect(outcome).toBe("upgraded");
});

test("the service worker answers navigations with the app but never answers for /api/", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
  await swReady(page);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  // Even a navigation to the API reaches the Worker: the app's shell is never its answer.
  const api = await page.goto("/api/pull?after=0");
  expect(api?.headers()["content-type"]).toContain("application/json");
  await page.goto("/");

  await context.setOffline(true);
  const pull = await page.evaluate(() => fetch("/api/pull?after=0").then(() => "answered", () => "network error"));
  expect(pull).toBe("network error");
  await page.goto("/v/");
  await expect(page.getByRole("heading", { level: 1, name: "quits" })).toBeVisible();
});

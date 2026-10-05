import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { editExpense, eventually, goOnline, newDevice, settled } from "./devices";
import { addExpense, createTrip, joinTrip, syncNow, tab } from "./trip-flow";

// SPEC.md §15 S3 and S4: two devices, one trip, offline in between.

const rowOf = (page: Page, text: string) => page.getByTestId("expense-row").filter({ hasText: text });

test("a creator creates a trip, a friend joins from the link on another device and picks a name", async ({ page, browser, baseURL }) => {
  const link = await createTrip(page, "Sardegna 2026", ["Simone", "Sara", "Luca"]);
  expect(link).toMatch(/\/v\/#[A-Za-z0-9_-]{22}$/);
  await addExpense(page, { description: "Traghetto", amount: "90,00" });
  await expect(settled(page)).toBeVisible();

  const friend = await newDevice(browser, baseURL as string);
  await joinTrip(friend.page, link, "Sardegna 2026", "Sara");

  await expect(friend.page.getByRole("button", { name: "Sei Sara" })).toBeVisible();
  await expect(rowOf(friend.page, "Traghetto")).toContainText("tua parte 30,00");
  await friend.context.close();
});

test("a friend who is not on the list adds their name", async ({ page, browser, baseURL }) => {
  const link = await createTrip(page, "Dolomiti", ["Anna", "Bruno"]);
  const friend = await newDevice(browser, baseURL as string);

  await friend.page.goto(link);
  await friend.page.getByRole("button", { name: "Non sono nella lista" }).click();
  await friend.page.getByLabel("Il tuo nome").fill("Carla");
  await friend.page.getByRole("button", { name: "Aggiungimi" }).click();

  await expect(friend.page.getByRole("button", { name: "Sei Carla" })).toBeVisible();
  await eventually(page, async () => {
    await tab(page, "Viaggio").click();
    await expect(page.getByText("Carla", { exact: true })).toBeVisible({ timeout: 1000 });
  });
  await friend.context.close();
});

test("the token never appears in a request URL", async ({ page }) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  const link = await createTrip(page);
  const token = link.split("#")[1] as string;
  await addExpense(page, { description: "Cena", amount: "30,00" });
  await expect(settled(page)).toBeVisible();

  expect(urls.filter((url) => url.includes("/api/"))).not.toHaveLength(0);
  expect(urls.filter((url) => url.includes(token))).toEqual([]);
});

test("a wrong creator code gets the error message and cannot create", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Hai un codice da creatore?").fill("q-0000000000000000000A");
  await page.getByRole("button", { name: "Usa il codice" }).click();

  await expect(page.getByText("Questo codice non funziona. Controlla di averlo copiato intero.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Crea un viaggio" })).toHaveCount(0);
});

test("creating a trip needs a connection and says so", async ({ page, context }) => {
  await createTrip(page, "Primo");
  await page.getByRole("button", { name: "Torna all'inizio" }).click();
  await page.getByRole("button", { name: "Crea un viaggio" }).click();
  await page.getByLabel("Nome del viaggio").fill("Secondo");
  for (const person of ["Simone", "Sara"]) {
    await page.getByLabel(/Il tuo nome|Aggiungi un nome/).fill(person);
    await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
  }

  await context.setOffline(true);
  await page.getByRole("button", { name: "Crea il viaggio" }).click();

  await expect(page.getByText("Creare un viaggio richiede una connessione. Riprova quando sei online.")).toBeVisible();
  await context.setOffline(false);
});

test("two devices editing offline converge after reconnecting", async ({ page, context, browser, baseURL }) => {
  const link = await createTrip(page);
  const friend = await newDevice(browser, baseURL as string);
  await joinTrip(friend.page, link, "Sardegna 2026", "Sara");
  await expect(settled(page)).toBeVisible();

  await context.setOffline(true);
  await friend.context.setOffline(true);
  await addExpense(page, { description: "Colazione", amount: "12,00" });
  await addExpense(friend.page, { description: "Pranzo", amount: "45,00" });
  await expect(page.getByTestId("sync-line")).toContainText("Offline: 1 modifica in attesa");
  await expect(friend.page.getByTestId("sync-line")).toContainText("Offline: 1 modifica in attesa");

  await goOnline(context, page);
  await goOnline(friend.context, friend.page);

  for (const device of [page, friend.page]) {
    await eventually(device, async () => {
      await expect(rowOf(device, "Colazione")).toHaveCount(1, { timeout: 1000 });
      await expect(rowOf(device, "Pranzo")).toHaveCount(1, { timeout: 1000 });
    });
    await expect(settled(device)).toBeVisible();
  }
  // Same balances on both phones.
  const balancesOf = async (device: Page) => {
    await tab(device, "Saldi").click();
    // "(tu)" marks the device's own row; the figures are what must agree.
    const rows = (await device.getByTestId("balance-row").allInnerTexts()).map((row) => row.replace(" (tu)", ""));
    await tab(device, "Spese").click();
    return rows;
  };
  const onFirst = await balancesOf(page);
  expect(onFirst).toHaveLength(3);
  expect(await balancesOf(friend.page)).toEqual(onFirst);
  await friend.context.close();
});

test("a retried push creates no duplicates", async ({ page, browser, baseURL }) => {
  const link = await createTrip(page);
  await expect(settled(page)).toBeVisible();
  const friend = await newDevice(browser, baseURL as string);
  await joinTrip(friend.page, link, "Sardegna 2026", "Sara");

  // The server takes the first push but the answer never arrives: the device must send it again.
  let dropped = false;
  await page.route("**/api/push", async (route) => {
    if (dropped) return route.continue();
    dropped = true;
    await route.fetch();
    await route.fulfill({ status: 502, contentType: "application/json", body: "{}" });
  });
  await addExpense(page, { description: "Cena", amount: "60,00" });
  await expect.poll(() => dropped).toBe(true);
  await syncNow(page);

  await expect(settled(page)).toBeVisible();
  await eventually(friend.page, async () => {
    await expect(rowOf(friend.page, "Cena")).toHaveCount(1, { timeout: 1000 });
  });
  await syncNow(friend.page);
  await expect(rowOf(friend.page, "Cena")).toHaveCount(1);
  await expect(rowOf(page, "Cena")).toHaveCount(1);
  await friend.context.close();
});

test("edit against edit: the last one wins and both devices show the conflict", async ({ page, context, browser, baseURL }) => {
  const link = await createTrip(page);
  await addExpense(page, { description: "Cena", amount: "60,00" });
  await expect(settled(page)).toBeVisible();
  const friend = await newDevice(browser, baseURL as string);
  await joinTrip(friend.page, link, "Sardegna 2026", "Sara");
  await expect(rowOf(friend.page, "Cena")).toHaveCount(1);

  await context.setOffline(true);
  await friend.context.setOffline(true);
  await editExpense(page, "Cena", { amount: "70,00" });
  await editExpense(friend.page, "Cena", { amount: "80,00" });

  await goOnline(context, page);
  await expect(settled(page)).toBeVisible();
  await goOnline(friend.context, friend.page);
  await expect(settled(friend.page)).toBeVisible();

  await eventually(friend.page, async () => {
    await expect(friend.page.getByTestId("conflict-icon")).toBeVisible({ timeout: 1000 });
  });
  await friend.page.getByTestId("expense-row").click();
  await expect(friend.page.getByTestId("conflict-notice")).toContainText("Simone e Sara l'hanno modificata nello stesso momento.");
  await friend.page.getByRole("button", { name: "Va bene così" }).click();
  await expect(friend.page.getByTestId("conflict-notice")).toHaveCount(0);

  await eventually(page, async () => {
    await expect(page.getByTestId("conflict-icon")).toBeVisible({ timeout: 1000 });
  });
  await rowOf(page, "Cena").click();
  await expect(page.getByTestId("conflict-notice")).toContainText("Sara l'ha modificata mentre la modificavi tu.");
  await expect(page.getByTestId("detail-amount")).toHaveText("80,00 €");
  await page.getByRole("button", { name: "Ripristina la mia versione" }).click();
  await expect(page.getByTestId("detail-amount")).toHaveText("70,00 €");
  await expect(page.getByTestId("conflict-notice")).toHaveCount(0);
  await friend.context.close();
});

test("delete against edit: the expense stays deleted on both devices", async ({ page, context, browser, baseURL }) => {
  const link = await createTrip(page);
  await addExpense(page, { description: "Cena", amount: "60,00" });
  await expect(settled(page)).toBeVisible();
  const friend = await newDevice(browser, baseURL as string);
  await joinTrip(friend.page, link, "Sardegna 2026", "Sara");
  await expect(rowOf(friend.page, "Cena")).toHaveCount(1);

  await context.setOffline(true);
  await friend.context.setOffline(true);
  await editExpense(page, "Cena", { amount: "70,00" });
  await rowOf(friend.page, "Cena").click();
  await friend.page.getByRole("button", { name: "Elimina", exact: true }).click();
  await friend.page.getByRole("button", { name: "Sì, elimina", exact: true }).click();

  await goOnline(friend.context, friend.page);
  await expect(settled(friend.page)).toBeVisible();
  await goOnline(context, page);

  await eventually(page, async () => {
    await expect(rowOf(page, "Cena")).toHaveCount(0, { timeout: 1000 });
  });
  await expect(rowOf(friend.page, "Cena")).toHaveCount(0);
  await friend.context.close();
});

test("closing a trip makes it read only, and a change that arrives after the close is flagged", async ({ page, context, browser, baseURL }) => {
  const link = await createTrip(page);
  const friend = await newDevice(browser, baseURL as string);
  await joinTrip(friend.page, link, "Sardegna 2026", "Sara");
  await expect(settled(friend.page)).toBeVisible();

  await friend.context.setOffline(true);
  await addExpense(friend.page, { description: "Gelato", amount: "6,00" });

  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "Chiudi il viaggio" }).click();
  await expect(page.getByTestId("closed-bar")).toContainText("Viaggio chiuso, sola lettura.");
  await tab(page, "Spese").click();
  await expect(page.getByRole("button", { name: "Nuova spesa" })).toHaveCount(0);
  await expect(settled(page)).toBeVisible();

  await goOnline(friend.context, friend.page);
  await eventually(page, async () => {
    await expect(rowOf(page, "Gelato")).toHaveCount(1, { timeout: 1000 });
  });
  await expect(page.getByTestId("after-close")).toContainText("Dopo la chiusura è arrivata 1 modifica");

  await page.getByRole("button", { name: "Riapri" }).click();
  await expect(page.getByTestId("closed-bar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nuova spesa" })).toBeVisible();
  await friend.context.close();
});

test("regenerating the link: the old one shows the notice and the queued changes arrive through the new one", async ({ page, browser, baseURL }) => {
  const link = await createTrip(page);
  await expect(settled(page)).toBeVisible();
  const friend = await newDevice(browser, baseURL as string);
  await joinTrip(friend.page, link, "Sardegna 2026", "Sara");
  await expect(settled(friend.page)).toBeVisible();

  await friend.context.setOffline(true);
  await addExpense(friend.page, { description: "Pranzo", amount: "45,00" });

  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "Rigenera il link" }).click();
  await page.getByRole("button", { name: "Rigenera", exact: true }).click();
  await expect(page.getByText("Link rigenerato")).toBeVisible();
  const newLink = await page.getByLabel("Link del viaggio").inputValue();
  expect(newLink).not.toBe(link);

  // The old link, opened by someone new, shows the notice.
  const stranger = await newDevice(browser, baseURL as string);
  await stranger.page.goto(link);
  await expect(stranger.page.getByRole("heading", { level: 1, name: "Il link è cambiato" })).toBeVisible();
  await stranger.context.close();

  // The friend's device finds out when it syncs, and keeps its queue.
  await friend.context.setOffline(false);
  await syncNow(friend.page);
  await expect(friend.page.getByRole("heading", { level: 1, name: "Il link è cambiato" })).toBeVisible();

  // Opening the new link: the same trip, and the queue goes out.
  await friend.page.goto(newLink);
  await expect(friend.page.getByRole("heading", { level: 1, name: "Sardegna 2026" })).toBeVisible();
  await expect(rowOf(friend.page, "Pranzo")).toHaveCount(1);
  await eventually(page, async () => {
    await tab(page, "Spese").click();
    await expect(rowOf(page, "Pranzo")).toHaveCount(1, { timeout: 1000 });
  });

  await friend.page.getByRole("button", { name: "Torna all'inizio" }).click();
  await expect(friend.page.getByRole("button", { name: /Sardegna 2026/ })).toHaveCount(1);
  await friend.context.close();
});

test("deleting a trip: who and until when, anyone restores it, and the queued changes then arrive", async ({ page, browser, baseURL }) => {
  const link = await createTrip(page);
  await expect(settled(page)).toBeVisible();
  const friend = await newDevice(browser, baseURL as string);
  await joinTrip(friend.page, link, "Sardegna 2026", "Sara");
  await expect(settled(friend.page)).toBeVisible();

  await friend.context.setOffline(true);
  await addExpense(friend.page, { description: "Pranzo", amount: "45,00" });

  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "Elimina il viaggio" }).click();
  await page.getByRole("button", { name: "Sì, elimina per tutti" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Questo viaggio è stato eliminato" })).toBeVisible();
  await expect(page.getByTestId("deleted-text")).toContainText(/eliminato da Simone il .* fino al /);

  await goOnline(friend.context, friend.page);
  await expect(friend.page.getByRole("heading", { level: 1, name: "Questo viaggio è stato eliminato" })).toBeVisible();
  await expect(friend.page.getByTestId("deleted-text")).toContainText("eliminato da Simone");
  await friend.page.getByRole("button", { name: "Ripristina" }).click();

  await expect(friend.page.getByRole("heading", { level: 1, name: "Sardegna 2026" })).toBeVisible();
  await expect(settled(friend.page)).toBeVisible();
  await eventually(page, async () => {
    await expect(page.getByRole("heading", { level: 1, name: "Sardegna 2026" })).toBeVisible({ timeout: 1000 });
    await expect(rowOf(page, "Pranzo")).toHaveCount(1, { timeout: 1000 });
  });
  await friend.context.close();
});

test("a deleted trip is listed on the landing with Ripristina", async ({ page }) => {
  await createTrip(page);
  await tab(page, "Viaggio").click();
  await page.getByRole("button", { name: "Elimina il viaggio" }).click();
  await page.getByRole("button", { name: "Sì, elimina per tutti" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Questo viaggio è stato eliminato" })).toBeVisible();
  await page.getByRole("button", { name: "Torna all'inizio" }).click();

  await expect(page.getByRole("heading", { name: "Eliminati" })).toBeVisible();
  await expect(page.getByText(/Eliminato il .* Si può ripristinare fino al /)).toBeVisible();
  await page.getByRole("button", { name: "Ripristina" }).click();

  await expect(page.getByRole("heading", { name: "Eliminati" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Sardegna 2026/ })).toBeVisible();
});

test("a link that leads to no trip says the trip is no longer available", async ({ page }) => {
  await page.goto("/v/#AAAAAAAAAAAAAAAAAAAAAA");

  await expect(page.getByRole("heading", { level: 1, name: "Questo viaggio non è più disponibile." })).toBeVisible();
});

test("an unknown link with no connection asks for one, and opens once it is back", async ({ page, context }) => {
  const link = await createTrip(page);
  await expect(settled(page)).toBeVisible();
  await page.getByRole("button", { name: "Torna all'inizio" }).click();
  // Forget the trip's token locally by opening a fresh context is not needed: use a second tab-less visit.
  await context.setOffline(true);
  await page.goto("/v/#BBBBBBBBBBBBBBBBBBBBBB");
  await expect(page.getByRole("heading", { level: 1, name: "Per aprire questo link serve una connessione" })).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Riprova" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Questo viaggio non è più disponibile." })).toBeVisible();
  expect(link).toBeTruthy();
});

test("a trip known on the device opens from its link with no connection", async ({ page, context }) => {
  const link = await createTrip(page);
  await addExpense(page, { description: "Cena", amount: "30,00" });
  await expect(settled(page)).toBeVisible();
  await page.evaluate(async () => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.goto(link);

  await expect(page.getByRole("heading", { level: 1, name: "Sardegna 2026" })).toBeVisible();
  await expect(rowOf(page, "Cena")).toHaveCount(1);
  await expect(page.getByTestId("sync-line")).toContainText("Offline");
});

test("two tabs on the same trip refresh each other", async ({ page, context }) => {
  await createTrip(page);
  await expect(settled(page)).toBeVisible();
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByRole("heading", { level: 1, name: "Sardegna 2026" })).toBeVisible();

  await addExpense(page, { description: "Cena", amount: "30,00" });

  await expect(rowOf(second, "Cena")).toHaveCount(1);
});

test("an operation the server refuses lands in the rejected store alone, and is not sent again", async ({ page, browser, baseURL }) => {
  const link = await createTrip(page);
  await expect(settled(page)).toBeVisible();
  const friend = await newDevice(browser, baseURL as string);
  await joinTrip(friend.page, link, "Sardegna 2026", "Sara");

  // An operation of a version this server does not know, written straight into the outbox.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("quits");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(["trips", "outbox"], "readwrite");
          const trips = tx.objectStore("trips").getAll();
          trips.onsuccess = () => {
            const meta = trips.result[0];
            tx.objectStore("outbox").put({
              tripId: meta.tripId,
              n: meta.nextOutbox + 50,
              operation: { id: crypto.randomUUID(), v: 99, by: meta.meId, device: "d", at: new Date().toISOString(), type: "TripRenamed", name: "Boh" },
            });
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await addExpense(page, { description: "Cena", amount: "30,00" });

  await eventually(friend.page, async () => {
    await expect(rowOf(friend.page, "Cena")).toHaveCount(1, { timeout: 1000 });
  });
  await expect(settled(page)).toBeVisible();
  const state = await page.evaluate(
    () =>
      new Promise<{ outbox: number; rejected: number }>((resolve, reject) => {
        const open = indexedDB.open("quits");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(["outbox", "rejected"]);
          const outbox = tx.objectStore("outbox").count();
          const rejected = tx.objectStore("rejected").count();
          tx.oncomplete = () => resolve({ outbox: outbox.result, rejected: rejected.result });
        };
      }),
  );
  expect(state).toEqual({ outbox: 0, rejected: 1 });
  await friend.context.close();
});

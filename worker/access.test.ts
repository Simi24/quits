import { env, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { expense, expenseCreated, op } from "../domain/testing.ts";
import { sha256Hex } from "./sha256.ts";
import { directoryStub, tripStub } from "./jurisdiction.ts";
import { api, bearer, newTrip } from "./testing/api.ts";

const regenerate = (token: string, operation = op({ type: "LinkRegenerated" })) =>
  api("POST", "/api/trip/regenerate-link", { auth: bearer(token), body: { operation } });

describe("regenerating the link", () => {
  it("returns a new token for the same trip and kills the old one at once", async () => {
    const { tripId, token } = await newTrip();
    const regenerated = await regenerate(token);
    expect(regenerated.status).toBe(200);
    expect(regenerated.body.tripId).toBe(tripId);
    expect(regenerated.body.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(regenerated.body.token).not.toBe(token);

    const old = await api("GET", "/api/pull", { auth: bearer(token) });
    expect(old.status).toBe(410);
    expect(old.body).toEqual({ error: "link_changed", tripId });
    const oldPush = await api("POST", "/api/push", { auth: bearer(token), body: { operations: [] } });
    expect(oldPush.body).toEqual({ error: "link_changed", tripId });

    const fresh = await api("GET", "/api/pull", { auth: bearer(regenerated.body.token) });
    expect(fresh.status).toBe(200);
    expect(fresh.body.tripId).toBe(tripId);
  });

  it("appends the operation to the log, so the history shows it", async () => {
    const { token } = await newTrip();
    const operation = op({ type: "LinkRegenerated" }, { id: "regen" });
    const { body } = await regenerate(token, operation);
    const pulled = await api("GET", "/api/pull", { auth: bearer(body.token) });
    expect(pulled.body.operations.map((o: { operation: { id: string } }) => o.operation.id)).toContain("regen");
  });

  it("lets the queue of the old link arrive through the new one", async () => {
    const { token } = await newTrip();
    const { body } = await regenerate(token);
    const queued = expenseCreated("e1", expense(), { id: "queued" });
    const pushed = await api("POST", "/api/push", { auth: bearer(body.token), body: { operations: [queued] } });
    expect(pushed.body.results[0]).toMatchObject({ id: "queued", status: "appended" });
  });

  it("lets only one of two simultaneous regenerations win", async () => {
    const { token } = await newTrip();
    const [a, b] = await Promise.all([regenerate(token), regenerate(token, op({ type: "LinkRegenerated" }))]);
    expect([a.status, b.status].sort()).toEqual([200, 410]);
  });

  it("refuses an operation of another kind", async () => {
    const { token } = await newTrip();
    expect((await regenerate(token, op({ type: "TripClosed" }))).status).toBe(400);
  });
});

describe("what the server stores", () => {
  it("holds only the SHA-256 of a token in the Directory, the retired ones included, and no token in the trip", async () => {
    const { tripId, token } = await newTrip();
    const { body } = await regenerate(token);
    const tokens = [token, body.token as string];

    const rows = await runInDurableObject(directoryStub(env), (_, state) =>
      state.storage.sql.exec("SELECT * FROM tokens").toArray(),
    );
    expect(rows).toEqual(
      expect.arrayContaining([
        { token_hash: await sha256Hex(token), trip_id: tripId, state: "retired" },
        { token_hash: await sha256Hex(body.token), trip_id: tripId, state: "active" },
      ]),
    );
    const directoryDump = JSON.stringify(rows);
    const tripDump = JSON.stringify(
      await runInDurableObject(tripStub(env, tripId), (_, state) => [
        state.storage.sql.exec("SELECT * FROM ops").toArray(),
        state.storage.sql.exec("SELECT * FROM trip").toArray(),
      ]),
    );
    for (const secret of tokens) {
      expect(directoryDump).not.toContain(secret);
      expect(tripDump).not.toContain(secret);
    }
  });
});

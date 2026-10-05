import { env, runDurableObjectAlarm } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expense, expenseCreated, op } from "../domain/testing.ts";
import { tripStub } from "./jurisdiction.ts";
import { api, bearer, newTrip } from "./testing/api.ts";

const deleteTrip = (token: string, by = "p2") =>
  api("POST", "/api/trip/delete", { auth: bearer(token), body: { operation: op({ type: "TripDeleted" }, { by, id: `del-${by}` }) } });
const restoreTrip = (token: string, by = "p3") =>
  api("POST", "/api/trip/restore", { auth: bearer(token), body: { operation: op({ type: "TripRestored" }, { by, id: `res-${by}-${Math.random()}` }) } });

describe("deleting a trip", () => {
  it("soft-deletes it and says until when it can be restored (30 days)", async () => {
    const { tripId, token } = await newTrip();
    const deleted = await deleteTrip(token);
    expect(deleted.status).toBe(200);
    expect(deleted.body.tripId).toBe(tripId);
    const days = (Date.parse(deleted.body.restoreUntil) - Date.parse(deleted.body.deletedAt)) / 86_400_000;
    expect(days).toBe(30);
  });

  it("answers 410 trip_deleted, with who and until when, to everything but a restore", async () => {
    const { tripId, token } = await newTrip();
    const { body: deleted } = await deleteTrip(token, "p2");
    const expected = {
      error: "trip_deleted",
      tripId,
      deletedBy: "p2",
      deletedAt: deleted.deletedAt,
      restoreUntil: deleted.restoreUntil,
    };

    const push = await api("POST", "/api/push", { auth: bearer(token), body: { operations: [] } });
    expect([push.status, push.body]).toEqual([410, expected]);
    const pull = await api("GET", "/api/pull", { auth: bearer(token) });
    expect([pull.status, pull.body]).toEqual([410, expected]);
    expect((await deleteTrip(token, "p1")).body).toEqual(expected);
  });

  it("is restorable by anyone with the link; the log keeps both operations and the outbox can then push", async () => {
    const { token } = await newTrip();
    await deleteTrip(token, "p2");
    const restored = await restoreTrip(token, "p3");
    expect(restored.status).toBe(200);
    expect(restored.body).toMatchObject({ restored: true, seq: 3 });

    const queued = expenseCreated("e1", expense(), { id: "queued" });
    const pushed = await api("POST", "/api/push", { auth: bearer(token), body: { operations: [queued] } });
    expect(pushed.body.results[0]).toMatchObject({ status: "appended", seq: 4 });
    const types = (await api("GET", "/api/pull", { auth: bearer(token) })).body.operations.map(
      (o: { operation: { type: string } }) => o.operation.type,
    );
    expect(types).toEqual(["TripCreated", "TripDeleted", "TripRestored", "ExpenseCreated"]);
  });

  it("treats restoring a trip that is not deleted as a no-op", async () => {
    const { token } = await newTrip();
    const response = await restoreTrip(token);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ restored: false, seq: null });
  });

  it("refuses an operation of another kind", async () => {
    const { token } = await newTrip();
    const wrong = await api("POST", "/api/trip/delete", { auth: bearer(token), body: { operation: op({ type: "TripClosed" }) } });
    expect(wrong.status).toBe(400);
  });
});

describe("purging a deleted trip", () => {
  afterEach(() => vi.useRealTimers());

  it("leaves the token leading nowhere once the 30 days are over", async () => {
    const { tripId, token } = await newTrip();
    await deleteTrip(token);
    expect(await runDurableObjectAlarm(tripStub(env, tripId))).toBe(true);

    const gone = await api("GET", "/api/pull", { auth: bearer(token) });
    expect(gone.status).toBe(404);
    expect(gone.body).toEqual({ error: "trip_unavailable" });
  });

  it("is cancelled by a restore", async () => {
    const { tripId, token } = await newTrip();
    await deleteTrip(token);
    await restoreTrip(token);
    expect(await runDurableObjectAlarm(tripStub(env, tripId))).toBe(false);
    expect((await api("GET", "/api/pull", { auth: bearer(token) })).status).toBe(200);
  });

  it("refuses a restore once the 30 days are over, even before the purge has run", async () => {
    const { token } = await newTrip();
    await deleteTrip(token);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 30 * 86_400_000 + 1);

    const late = await restoreTrip(token);
    expect([late.status, late.body]).toEqual([404, { error: "trip_unavailable" }]);
  });

  it("purges the retired tokens of the trip too", async () => {
    const { token } = await newTrip();
    const regenerated = await api("POST", "/api/trip/regenerate-link", { auth: bearer(token), body: { operation: op({ type: "LinkRegenerated" }) } });
    const { tripId } = regenerated.body;
    await deleteTrip(regenerated.body.token);
    await runDurableObjectAlarm(tripStub(env, tripId));
    expect((await api("GET", "/api/pull", { auth: bearer(token) })).status).toBe(404);
  });
});

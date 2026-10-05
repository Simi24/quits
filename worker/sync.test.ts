import { describe, expect, it } from "vitest";
import { expense, expenseCreated, op } from "../domain/testing.ts";
import { api, bearer, newTrip } from "./testing/api.ts";
import { ALICE_CODE, REVOKED_CODE } from "./testing/fixtures.ts";

const pushOps = (token: string, operations: unknown[]) => api("POST", "/api/push", { auth: bearer(token), body: { operations } });
const pullAfter = (token: string, after: number) => api("GET", "/api/pull", { auth: bearer(token), query: `?after=${after}` });

describe("creating a trip", () => {
  it("returns the tripId, a 22-character token and the first sequence number", async () => {
    const { tripId, token, seq } = await newTrip();
    expect(tripId).toMatch(/^[0-9a-f-]{36}$/);
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(seq).toBe(1);
  });

  it("answers 403 to a wrong or revoked code and creates nothing", async () => {
    const response = await api("POST", "/api/trips", { auth: `Creator ${REVOKED_CODE}`, body: { operation: op({ type: "TripClosed" }) } });
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "invalid_creator_code" });
  });

  it("refuses a body that is not a TripCreated operation", async () => {
    const response = await api("POST", "/api/trips", { auth: `Creator ${ALICE_CODE}`, body: { operation: op({ type: "TripClosed" }) } });
    expect(response.status).toBe(400);
  });
});

describe("push and pull", () => {
  it("stores operations in order with gap-free sequence numbers and returns the tripId", async () => {
    const { tripId, token } = await newTrip();
    const a = expenseCreated("e1", expense(), { id: "a" });
    const b = expenseCreated("e2", expense(), { id: "b" });

    const pushed = await pushOps(token, [a, b]);
    expect(pushed.status).toBe(200);
    expect(pushed.body).toEqual({
      tripId,
      results: [
        { id: "a", status: "appended", seq: 2 },
        { id: "b", status: "appended", seq: 3 },
      ],
    });

    const pulled = await pullAfter(token, 1);
    expect(pulled.body.tripId).toBe(tripId);
    expect(pulled.body.operations).toEqual([
      { seq: 2, operation: a },
      { seq: 3, operation: b },
    ]);
    expect(pulled.body.hasMore).toBe(false);
  });

  it("makes a retried push idempotent: no duplicates, and no gap in the sequence", async () => {
    const { token } = await newTrip();
    const a = expenseCreated("e1", expense(), { id: "a" });
    await pushOps(token, [a]);

    const retried = await pushOps(token, [a, expenseCreated("e2", expense(), { id: "b" })]);
    expect(retried.body.results).toEqual([
      { id: "a", status: "stored", seq: 2 },
      { id: "b", status: "appended", seq: 3 },
    ]);
    const all = await pullAfter(token, 0);
    expect(all.body.operations.map((o: { seq: number }) => o.seq)).toEqual([1, 2, 3]);
  });

  it("rejects a malformed operation and one of an unknown version alone, and stores the rest of the batch", async () => {
    const { token } = await newTrip();
    const good = expenseCreated("e1", expense(), { id: "good" });
    const malformed = { ...expenseCreated("e2", expense(), { id: "bad" }), expenseId: 42 };
    const future = { ...expenseCreated("e3", expense(), { id: "future" }), v: 99 };

    const pushed = await pushOps(token, [malformed, good, future, "not an object"]);
    expect(pushed.status).toBe(200);
    expect(pushed.body.results).toEqual([
      { id: "bad", status: "rejected", reason: "malformed", detail: expect.any(String) },
      { id: "good", status: "appended", seq: 2 },
      { id: "future", status: "rejected", reason: "unknown_version", detail: "v99" },
      { id: null, status: "rejected", reason: "malformed", detail: expect.any(String) },
    ]);
    const all = await pullAfter(token, 1);
    expect(all.body.operations).toHaveLength(1);
  });

  it("rejects server actions sent through push", async () => {
    const { token } = await newTrip();
    const pushed = await pushOps(token, [op({ type: "TripDeleted" }, { id: "d" }), op({ type: "LinkRegenerated" }, { id: "r" })]);
    expect(pushed.body.results.map((r: { reason: string }) => r.reason)).toEqual(["server_action", "server_action"]);
  });

  it("accepts an operation of an older known version", async () => {
    const { token } = await newTrip();
    const legacy = op(
      { type: "ExpenseCreated", expenseId: "e1", expense: { ...expense(), categoryId: undefined, category: "restaurants" } },
      { id: "old", v: 1 },
    );
    const pushed = await pushOps(token, [legacy]);
    expect(pushed.body.results[0]).toMatchObject({ id: "old", status: "appended" });
  });

  it("pulls in pages and says when there is more", async () => {
    const { token } = await newTrip();
    for (let batch = 0; batch < 6; batch++) {
      const operations = Array.from({ length: 100 }, (_, i) => op({ type: "TripClosed" }, { id: `c-${batch}-${i}` }));
      await pushOps(token, operations);
    }
    const first = await pullAfter(token, 0);
    expect(first.body.operations).toHaveLength(500);
    expect(first.body.hasMore).toBe(true);
    const rest = await pullAfter(token, 500);
    expect(rest.body.operations).toHaveLength(101);
    expect(rest.body.hasMore).toBe(false);
  });

  it("refuses a batch over the limit and a bad body or cursor", async () => {
    const { token } = await newTrip();
    const tooMany = Array.from({ length: 101 }, (_, i) => op({ type: "TripClosed" }, { id: `x-${i}` }));
    expect((await pushOps(token, tooMany)).status).toBe(413);
    expect((await api("POST", "/api/push", { auth: bearer(token), body: { nope: 1 } })).status).toBe(400);
    expect((await pullAfter(token, -1)).status).toBe(400);
  });
});

describe("request size", () => {
  it("measures the body in bytes, not characters: over 1 MB is 413 too_large", async () => {
    const { token } = await newTrip();
    // 600,000 characters, 1.2 MB in UTF-8.
    const response = await api("POST", "/api/push", { auth: bearer(token), body: { operations: [], pad: "é".repeat(600_000) } });
    expect(response.status).toBe(413);
    expect(response.body.error).toBe("too_large");
  });
});

describe("authorization", () => {
  it("answers 401 without a bearer token and 404 trip_unavailable for a token that leads nowhere", async () => {
    expect((await api("GET", "/api/pull")).status).toBe(401);
    expect((await api("GET", "/api/pull", { auth: "Bearer not-a-token" })).status).toBe(401);
    const unknown = await api("GET", "/api/pull", { auth: bearer("A".repeat(22)) });
    expect(unknown.status).toBe(404);
    expect(unknown.body).toEqual({ error: "trip_unavailable" });
  });

  it("keeps trips apart", async () => {
    const first = await newTrip();
    const second = await newTrip();
    await pushOps(first.token, [expenseCreated("e1", expense(), { id: "only-first" })]);
    const pulled = await pullAfter(second.token, 0);
    expect(pulled.body.tripId).toBe(second.tripId);
    expect(pulled.body.operations).toHaveLength(1);
  });
});

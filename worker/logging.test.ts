import { env, runInDurableObject } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expense, expenseCreated, op } from "../domain/testing.ts";
import { directoryStub } from "./jurisdiction.ts";
import { sha256Hex } from "./sha256.ts";
import { api, bearer, newTrip } from "./testing/api.ts";
import { ALICE_CODE, REVOKED_CODE } from "./testing/fixtures.ts";

const CHANNELS = ["log", "info", "warn", "error", "debug"] as const;
let output: string[];

beforeEach(() => {
  output = [];
  for (const channel of CHANNELS) {
    vi.spyOn(console, channel).mockImplementation((...args: unknown[]) => {
      output.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    });
  }
});
afterEach(() => vi.restoreAllMocks());

describe("logging (SPEC.md §10.1)", () => {
  it("writes nothing on the happy paths and the refusals", async () => {
    const { token } = await newTrip();
    await api("POST", "/api/push", {
      auth: bearer(token),
      body: { operations: [expenseCreated("e1", expense({ description: "Cena segreta" })), { id: "bad", v: 99 }] },
    });
    await api("GET", "/api/pull", { auth: bearer(token) });
    await api("POST", "/api/creator/check", { auth: `Creator ${REVOKED_CODE}` });
    await api("GET", "/api/pull", { auth: bearer("A".repeat(22)) });
    await api("POST", "/api/trip/regenerate-link", { auth: bearer(token), body: { operation: op({ type: "LinkRegenerated" }) } });
    await api("GET", "/api/pull", { auth: bearer(token) });
    expect(output).toEqual([]);
  });

  it("logs an error as its route and class only: no token, code, header or operation content", async () => {
    // A token the Directory knows for a trip that has no Durable Object state: the trip's code throws.
    const token = "B".repeat(22);
    const hash = await sha256Hex(token);
    await runInDurableObject(directoryStub(env), (directory) => directory.register(hash, "ghost-trip"));
    const secretOperation = expenseCreated("e1", expense({ description: "Cena segreta" }), { id: "secret-op" });

    const response = await api("POST", "/api/push", { auth: bearer(token), body: { operations: [secretOperation] } });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "internal_error" });
    expect(output).toEqual([JSON.stringify({ event: "error", where: "/api/push", error: "Error" })]);
    const everything = output.join("\n");
    for (const forbidden of [token, "Bearer", "Authorization", "Cena segreta", "secret-op", ALICE_CODE, "127.0.0.1"]) {
      expect(everything).not.toContain(forbidden);
    }
  });
});

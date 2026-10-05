import { describe, expect, it } from "vitest";
import { createTrip } from "./routes/create-trip.ts";
import { creatorCheck } from "./routes/creator-check.ts";
import { api } from "./testing/api.ts";
import { ALICE_CODE, REVOKED_CODE } from "./testing/fixtures.ts";

describe("POST /api/creator/check", () => {
  it("accepts a creator code", async () => {
    const response = await api("POST", "/api/creator/check", { auth: `Creator ${ALICE_CODE}` });
    expect(response.status).toBe(200);
  });

  it("accepts the code typed in lower case", async () => {
    const response = await api("POST", "/api/creator/check", { auth: `Creator ${ALICE_CODE.toLowerCase()}` });
    expect(response.status).toBe(200);
  });

  it("answers 403 to a wrong or revoked code", async () => {
    const response = await api("POST", "/api/creator/check", { auth: `Creator ${REVOKED_CODE}` });
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "invalid_creator_code" });
  });

  it("answers 403 to a missing or foreign scheme", async () => {
    expect((await api("POST", "/api/creator/check")).status).toBe(403);
    expect((await api("POST", "/api/creator/check", { auth: `Bearer ${ALICE_CODE}` })).status).toBe(403);
  });
});

describe("a Worker whose CREATOR_CODES secret is not set yet", () => {
  const withoutSecret = {} as Env;
  const asCreator = (path: string) =>
    new Request(`https://quits.test${path}`, { method: "POST", headers: { Authorization: `Creator ${ALICE_CODE}` } });

  it("answers 403 on the creator check, as with an empty list", async () => {
    const response = await creatorCheck(asCreator("/api/creator/check"), withoutSecret);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "invalid_creator_code" });
  });

  it("answers 403 on trip creation", async () => {
    const response = await createTrip(asCreator("/api/trips"), withoutSecret);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "invalid_creator_code" });
  });
});

import { describe, expect, it } from "vitest";
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

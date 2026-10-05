import { describe, expect, it } from "vitest";
import { api } from "./testing/api.ts";

describe("the API router", () => {
  it("answers an unknown API path with a JSON 404", async () => {
    const response = await api("GET", "/api/nothing");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "not_found" });
  });

  it("answers a wrong method with 405", async () => {
    expect((await api("GET", "/api/push")).status).toBe(405);
  });

  it("sends Referrer-Policy: no-referrer and no caching on every answer", async () => {
    const response = await api("GET", "/api/nothing");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

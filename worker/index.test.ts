import { describe, expect, it } from "vitest";
import worker from "./index.ts";

describe("worker skeleton", () => {
  it("answers an unknown API path with a JSON 404", async () => {
    const response = await worker.fetch(new Request("https://quits.test/api/nothing"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });
});

import { describe, expect, it } from "vitest";
import { createApi } from "./api";

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

const recording = (answer: () => Response | Promise<Response>) => {
  const seen: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    seen.push({ url, init });
    return answer();
  }) as unknown as typeof fetch;
  return { seen, api: createApi(fetchFn) };
};

describe("createApi", () => {
  it("sends the token only in the Authorization header, never in the URL or the body", async () => {
    const { seen, api } = recording(() => reply(200, { tripId: "t", operations: [], hasMore: false }));

    await api.pull("SECRET-TOKEN", 3);
    await api.push("SECRET-TOKEN", []);

    for (const { url, init } of seen) {
      expect(url).not.toContain("SECRET-TOKEN");
      expect(String(init.body ?? "")).not.toContain("SECRET-TOKEN");
      expect(new Headers(init.headers).get("Authorization")).toBe("Bearer SECRET-TOKEN");
    }
    expect(seen[0]?.url).toBe("/api/pull?after=3");
  });

  it("creator requests use the Creator scheme", async () => {
    const { seen, api } = recording(() => reply(200, { ok: true }));

    await api.checkCode("q-ABC");

    expect(new Headers(seen[0]?.init.headers).get("Authorization")).toBe("Creator q-ABC");
  });

  it("tells the refusals apart", async () => {
    const deletion = { deletedBy: "p1", deletedAt: "2026-07-01T00:00:00Z", restoreUntil: "2026-07-31T00:00:00Z" };
    const answers: [Response, unknown][] = [
      [reply(410, { error: "link_changed", tripId: "t" }), { kind: "link_changed", tripId: "t" }],
      [reply(410, { error: "trip_deleted", tripId: "t", ...deletion }), { kind: "deleted", tripId: "t", deletion }],
      [reply(404, { error: "trip_unavailable" }), { kind: "unavailable" }],
      [reply(403, { error: "invalid_creator_code" }), { kind: "forbidden" }],
      [reply(500, { error: "internal_error" }), { kind: "error", status: 500 }],
    ];
    for (const [response, expected] of answers) {
      const { api } = recording(() => response);
      expect(await api.pull("t", 0)).toEqual(expected);
    }
  });

  it("only trip_unavailable means the trip is gone: any other 404 is a plain error, so the trip keeps syncing", async () => {
    const { api } = recording(() => reply(404, { error: "not_found" }));

    expect(await api.pull("t", 0)).toEqual({ kind: "error", status: 404 });
  });

  it("a success that is not JSON (a captive portal's page) is an error, not an empty answer", async () => {
    const { api } = recording(() => new Response("<html>Wi-Fi login</html>", { status: 200, headers: { "Content-Type": "text/html" } }));

    expect(await api.pull("t", 0)).toEqual({ kind: "error", status: 200 });
  });

  it("a request that cannot reach the server is offline", async () => {
    const { api } = recording(() => Promise.reject(new TypeError("Failed to fetch")));

    expect(await api.pull("t", 0)).toEqual({ kind: "offline" });
  });
});

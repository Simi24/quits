import type { Operation } from "../../domain";
import type { Api, ApiFailure, ApiResult, Deletion } from "./types";

type FetchFn = typeof fetch;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** Reads the refusals of SPEC.md §6.4. Anything unexpected is an `error` with its status. */
function failureOf(status: number, body: unknown): ApiFailure {
  const data = isObject(body) ? body : {};
  const tripId = typeof data.tripId === "string" ? data.tripId : "";
  if (status === 410 && data.error === "link_changed") return { kind: "link_changed", tripId };
  if (status === 410 && data.error === "trip_deleted") {
    const deletion: Deletion = {
      deletedBy: String(data.deletedBy),
      deletedAt: String(data.deletedAt),
      restoreUntil: String(data.restoreUntil),
    };
    return { kind: "deleted", tripId, deletion };
  }
  if (status === 404 && data.error === "trip_unavailable") return { kind: "unavailable" };
  if (status === 403) return { kind: "forbidden" };
  return { kind: "error", status };
}

/**
 * The HTTP client. The token goes only in the `Authorization` header, never in the URL (SPEC.md §4);
 * a request that cannot reach the server is `offline`, whatever `navigator.onLine` says (SPEC.md §5.3).
 */
export const createApi = (fetchFn: FetchFn = (...args) => fetch(...args)): Api => {
  async function call<T>(method: "GET" | "POST", path: string, authorization: string, body?: unknown): Promise<ApiResult<T>> {
    let response: Response;
    try {
      response = await fetchFn(path, {
        method,
        headers: { Authorization: authorization, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        referrerPolicy: "no-referrer",
      });
    } catch {
      return { kind: "offline" };
    }
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
    if (!response.ok) return failureOf(response.status, parsed);
    // Every answer of the API is a JSON object; anything else (a captive portal's page) did not come from it.
    if (!isObject(parsed)) return { kind: "error", status: response.status };
    return { kind: "ok", ...parsed } as ApiResult<T>;
  }

  const bearer = (token: string) => `Bearer ${token}`;
  const creator = (code: string) => `Creator ${code}`;
  const action = (token: string, path: string, operation: Operation) => call<never>("POST", path, bearer(token), { operation });

  return {
    push: (token, operations) => call("POST", "/api/push", bearer(token), { operations }),
    pull: (token, after) => call("GET", `/api/pull?after=${after}`, bearer(token)),
    createTrip: (code, operation) => call("POST", "/api/trips", creator(code), { operation }),
    checkCode: (code) => call("POST", "/api/creator/check", creator(code)),
    regenerateLink: (token, operation) => action(token, "/api/trip/regenerate-link", operation),
    deleteTrip: (token, operation) => action(token, "/api/trip/delete", operation),
    restoreTrip: (token, operation) => action(token, "/api/trip/restore", operation),
  };
};

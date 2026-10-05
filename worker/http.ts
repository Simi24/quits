import type { DeletedInfo } from "./trip-types.ts";

const HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export const json = (body: unknown, status = 200, extra: HeadersInit = {}) =>
  Response.json(body, { status, headers: { ...HEADERS, ...extra } });

export const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  json({ error, ...extra }, status);

/** The trip was deleted and can still be restored (SPEC.md §6.4). Carries what the deleted-trip screen shows. */
export const tripDeleted = (tripId: string, deleted: DeletedInfo) =>
  fail(410, "trip_deleted", { tripId, ...deleted });

const MAX_BODY_BYTES = 1_000_000;

/** The request's JSON body, or a ready 4xx response. */
export async function readJson(request: Request): Promise<{ body: unknown } | { response: Response }> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return { response: fail(413, "too_large") };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { response: fail(400, "bad_request") };
  }
}

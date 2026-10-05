import type { DeletedInfo } from "./trip-types.ts";

const HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: HEADERS });

export const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  json({ error, ...extra }, status);

/** The trip was deleted and can still be restored (SPEC.md §6.4). Carries what the deleted-trip screen shows. */
export const tripDeleted = (tripId: string, deleted: DeletedInfo) =>
  fail(410, "trip_deleted", { tripId, ...deleted });

const MAX_BODY_BYTES = 1_000_000;

/** What a trip-scoped refusal carries besides its error: the `tripId` (SPEC.md §6.1). Empty before a trip exists. */
export type Scope = { tripId?: string };

/** The request's JSON body, or a ready 4xx response. */
export async function readJson(request: Request, scope: Scope = {}): Promise<{ body: unknown } | { response: Response }> {
  const text = await readCapped(request, MAX_BODY_BYTES);
  if (text === null) return { response: fail(413, "too_large", scope) };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { response: fail(400, "bad_request", scope) };
  }
}

/** The body as text, or null past `maxBytes`: reading stops there, so a huge body is never buffered whole. */
async function readCapped(request: Request, maxBytes: number): Promise<string | null> {
  if (Number(request.headers.get("Content-Length") ?? 0) > maxBytes) return null;
  if (!request.body) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request.body) {
    size += chunk.byteLength;
    if (size > maxBytes) return null;
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

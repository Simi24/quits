import { parseOperation } from "../../domain/index.ts";
import type { StoredOperation } from "../../domain/index.ts";
import { fail, readJson } from "../http.ts";

/** The `{ operation }` body of a server action, which must be of the kind the endpoint is for. */
export async function readServerOperation(
  request: Request,
  type: StoredOperation["type"],
): Promise<{ operation: StoredOperation } | { response: Response }> {
  const read = await readJson(request);
  if ("response" in read) return read;
  const raw = typeof read.body === "object" && read.body !== null ? (read.body as { operation?: unknown }).operation : undefined;
  const parsed = parseOperation(raw);
  if (!parsed.ok) return { response: fail(400, "invalid_operation", { reason: parsed.reason, detail: parsed.detail }) };
  if (parsed.operation.type !== type) {
    return { response: fail(400, "invalid_operation", { reason: "wrong_type", detail: `expected ${type}` }) };
  }
  return { operation: parsed.operation };
}

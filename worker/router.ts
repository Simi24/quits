import { fail } from "./http.ts";
import { logError } from "./log.ts";
import { createTrip } from "./routes/create-trip.ts";
import { creatorCheck } from "./routes/creator-check.ts";
import { deleteTrip } from "./routes/delete-trip.ts";
import { pull } from "./routes/pull.ts";
import { push } from "./routes/push.ts";
import { regenerateLink } from "./routes/regenerate-link.ts";
import { restoreTrip } from "./routes/restore-trip.ts";

type Handler = (request: Request, env: Env) => Promise<Response>;

/** SPEC.md §6.2. No path carries a trip id or a token. */
const routes: Record<string, Partial<Record<"GET" | "POST", Handler>>> = {
  "/api/trips": { POST: createTrip },
  "/api/creator/check": { POST: creatorCheck },
  "/api/push": { POST: push },
  "/api/pull": { GET: pull },
  "/api/trip/regenerate-link": { POST: regenerateLink },
  "/api/trip/delete": { POST: deleteTrip },
  "/api/trip/restore": { POST: restoreTrip },
};

export async function route(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  const methods = Object.hasOwn(routes, path) ? routes[path] : undefined;
  if (!methods) return fail(404, "not_found");
  const handler = methods[request.method as "GET" | "POST"];
  if (!handler) return fail(405, "method_not_allowed");
  try {
    return await handler(request, env);
  } catch (error) {
    logError(path, error);
    return fail(500, "internal_error");
  }
}

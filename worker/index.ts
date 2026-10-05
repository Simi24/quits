// The Worker entry (SPEC.md §6.1). Static assets are served by the assets binding; only `/api/*`
// reaches this code (wrangler.jsonc `run_worker_first`).
import { route } from "./router.ts";

export { Directory } from "./directory.ts";
export { Trip } from "./trip.ts";

export default {
  fetch: (request, env) => route(request, env),
} satisfies ExportedHandler<Env>;

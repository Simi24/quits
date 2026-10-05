/**
 * The only logging the Worker does (SPEC.md §10.1): errors, as the route and the error's class name.
 * Never headers, IPs, tokens, messages (they can quote input) or operation contents.
 */
export function logError(where: string, error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";
  console.error(JSON.stringify({ event: "error", where, error: name }));
}

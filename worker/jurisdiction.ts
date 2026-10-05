import type { Trip } from "./trip.ts";
import type { Directory } from "./directory.ts";

/**
 * Every Durable Object, the Directory included, lives in the EU jurisdiction (SPEC.md §11.3).
 * Only the explicit `JURISDICTION=none` (local runs and tests: workerd does not implement
 * jurisdictions) turns it off; a missing or misspelt value keeps the EU.
 */
function inJurisdiction<T extends Rpc.DurableObjectBranded | undefined>(namespace: DurableObjectNamespace<T>, env: Env) {
  const setting: string = env.JURISDICTION;
  return setting === "none" ? namespace : namespace.jurisdiction("eu");
}

const DIRECTORY_NAME = "directory";

export const tripStub = (env: Env, tripId: string) => inJurisdiction(env.TRIP as DurableObjectNamespace<Trip>, env).getByName(tripId);

export const directoryStub = (env: Env) =>
  inJurisdiction(env.DIRECTORY as DurableObjectNamespace<Directory>, env).getByName(DIRECTORY_NAME);

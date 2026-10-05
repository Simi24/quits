import { describe, expect, it } from "vitest";
import { directoryStub, tripStub } from "./jurisdiction.ts";

/** A namespace that records how it was addressed. */
function recordingNamespace() {
  const calls: string[] = [];
  const namespace = {
    jurisdiction: (name: string) => {
      calls.push(`jurisdiction:${name}`);
      return namespace;
    },
    getByName: (name: string) => {
      calls.push(`getByName:${name}`);
      return {};
    },
  };
  return { namespace, calls };
}

const envWith = (setting: string, trip: object, directory: object) => ({ JURISDICTION: setting, TRIP: trip, DIRECTORY: directory }) as unknown as Env;

describe("jurisdiction", () => {
  it("puts the trip and the Directory in the EU", () => {
    const trip = recordingNamespace();
    const directory = recordingNamespace();
    const env = envWith("eu", trip.namespace, directory.namespace);
    tripStub(env, "t1");
    directoryStub(env);
    expect(trip.calls).toEqual(["jurisdiction:eu", "getByName:t1"]);
    expect(directory.calls).toEqual(["jurisdiction:eu", "getByName:directory"]);
  });

  it("keeps the EU when the setting is missing or misspelt; only 'none' drops it", () => {
    const missing = recordingNamespace();
    tripStub(envWith(undefined as never, missing.namespace, {}), "t1");
    expect(missing.calls[0]).toBe("jurisdiction:eu");
    const typo = recordingNamespace();
    tripStub(envWith("None", typo.namespace, {}), "t1");
    expect(typo.calls[0]).toBe("jurisdiction:eu");
    const none = recordingNamespace();
    tripStub(envWith("none", none.namespace, {}), "t1");
    expect(none.calls).toEqual(["getByName:t1"]);
  });
});

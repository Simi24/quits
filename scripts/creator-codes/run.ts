import { hashCode } from "../../worker/creator-codes.ts";
import { newCreatorCode } from "./generate.ts";
import { loadEntries, saveEntries } from "./store.ts";

export type Deps = {
  /** Where `creator-codes.json` lives. */
  dir: string;
  /** Writes the JSON to the Worker secret. */
  upload: (json: string) => Promise<void>;
  print: (line: string) => void;
};

const USAGE = "usage: creator-codes add <label> | revoke <label> | list | sync";

/** The commands of SPEC.md §4. Throws an Error whose message is for the author. */
export async function run(argv: string[], { dir, upload, print }: Deps): Promise<void> {
  const [command, label] = argv;
  const entries = loadEntries(dir);
  const publish = async () => {
    try {
      await upload(JSON.stringify(entries));
    } catch (error) {
      throw new Error(`saved locally, but the Worker secret was not updated (${(error as Error).message}); run "sync" to retry`);
    }
  };

  switch (command) {
    case "add": {
      if (!label) throw new Error(USAGE);
      if (entries.some((entry) => entry.label === label)) throw new Error(`there is already a code labelled "${label}"`);
      const code = newCreatorCode();
      entries.push({ label, hash: await hashCode(code) });
      saveEntries(dir, entries);
      // Shown once, before the upload, so a failed upload does not lose it.
      print(`${label}: ${code}`);
      print("This code is shown only now. Hand it to the person.");
      return publish();
    }
    case "revoke": {
      if (!label) throw new Error(USAGE);
      const remaining = entries.filter((entry) => entry.label !== label);
      if (remaining.length === entries.length) throw new Error(`no code is labelled "${label}"`);
      entries.length = 0;
      entries.push(...remaining);
      saveEntries(dir, entries);
      return publish();
    }
    case "list":
      for (const entry of entries) print(entry.label);
      if (entries.length === 0) print("(no creator codes)");
      return;
    case "sync":
      return publish();
    default:
      throw new Error(USAGE);
  }
}

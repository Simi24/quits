import { useState } from "react";
import type { ActionResult } from "../../sync";

/** Runs a server action (online only) and keeps the failure to show under its button. */
export function useServerAction() {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<"offline" | "failed" | null>(null);

  const run = async (action: () => Promise<ActionResult<object>>): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setFailure(null);
    const result = await action();
    setBusy(false);
    if (result.status === "ok") return true;
    setFailure(result.status === "offline" ? "offline" : "failed");
    return false;
  };
  return { run, busy, failure, clear: () => setFailure(null) };
}

import { useRef, useState } from "react";

/**
 * Runs an async action one at a time: a second tap while the first is still writing is ignored,
 * so a double tap never records an expense, a payment or a whole settle-all twice.
 * `busy` lets the button show it is disabled meanwhile.
 */
export function useSingleFlight<A extends unknown[]>(action: (...args: A) => Promise<void>) {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = async (...args: A) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await action(...args);
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  return { run, busy };
}

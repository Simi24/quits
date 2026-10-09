import { useState } from "react";
import { buildRecap } from "../../../domain";
import { useDevice } from "../../device";
import { tripLinkOf, useTrip } from "../../trip";

/**
 * "Condividi riepilogo": the system share sheet when there is one, else the clipboard, else the text to copy by hand.
 * Nothing here needs the network (SPEC.md §7.6 item 8).
 */
export function useShareRecap(notify: (text: string) => void) {
  const { t, lang } = useDevice();
  const { trip, money, token } = useTrip();
  const [manualText, setManualText] = useState<string | null>(null);

  const share = async () => {
    const text = buildRecap({ trip, lang, money, link: token ? tripLinkOf(token) : null });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: trip.name, text });
        return;
      } catch (error) {
        // Closing the share sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      notify(t.balances.summaryCopied);
    } catch {
      setManualText(text);
    }
  };

  return { share, manualText, closeManual: () => setManualText(null) };
}

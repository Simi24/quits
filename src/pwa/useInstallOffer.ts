import { useEffect, useState } from "react";
import { tripIdsWithPending } from "../db";
import { useDevice } from "../device";
import { useCanPrompt } from "./install-store";
import { installOffer } from "./install-offer";
import type { InstallOffer } from "./install-offer";
import { isInAppBrowser, isIos, isStandalone } from "./platform";

/**
 * Whether no trip on this device has changes waiting: the installed iOS app cannot see Safari's queue of any
 * of them (SPEC.md §5.6). Read again whenever the open trip's queue changes; null until IndexedDB answers.
 */
function useDeviceOutboxEmpty(openTripPending: number): boolean | null {
  const [empty, setEmpty] = useState<boolean | null>(null);
  useEffect(() => {
    let current = true;
    void tripIdsWithPending().then((ids) => {
      if (current) setEmpty(ids.length === 0);
    });
    return () => {
      current = false;
    };
  }, [openTripPending]);
  return empty;
}

/** What installing offers on this device right now (SPEC.md §5.6), given how many changes the open trip has waiting. */
export function useInstallOffer(openTripPending: number): InstallOffer {
  const { installDismissed } = useDevice();
  const canPrompt = useCanPrompt();
  const deviceOutboxEmpty = useDeviceOutboxEmpty(openTripPending);
  if (deviceOutboxEmpty === null) return "none";
  return installOffer({
    standalone: isStandalone(),
    ios: isIos(navigator.userAgent, navigator.maxTouchPoints),
    inApp: isInAppBrowser(navigator.userAgent),
    canPrompt,
    outboxEmpty: openTripPending === 0 && deviceOutboxEmpty,
    dismissed: installDismissed,
  });
}

import { useDevice } from "../device";
import { useCanPrompt } from "./install-store";
import { installOffer } from "./install-offer";
import type { InstallOffer } from "./install-offer";
import { isInAppBrowser, isIos, isStandalone } from "./platform";

/** What installing offers on this device right now (SPEC.md §5.6). `outboxEmpty` is the open trip's queue. */
export function useInstallOffer(outboxEmpty: boolean): InstallOffer {
  const { installDismissed } = useDevice();
  const canPrompt = useCanPrompt();
  return installOffer({
    standalone: isStandalone(),
    ios: isIos(navigator.userAgent, navigator.maxTouchPoints),
    inApp: isInAppBrowser(navigator.userAgent),
    canPrompt,
    outboxEmpty,
    dismissed: installDismissed,
  });
}

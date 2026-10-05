export interface InstallFacts {
  standalone: boolean;
  ios: boolean;
  inApp: boolean;
  /** The browser handed over its install prompt (`beforeinstallprompt`, Chromium). */
  canPrompt: boolean;
  outboxEmpty: boolean;
  /** The person dismissed the card on this device. */
  dismissed: boolean;
}

export type InstallOffer = "none" | "prompt" | "ios-steps" | "ios-wait";

/**
 * What the card in Viaggio shows (SPEC.md §5.6). On iOS the installed app receives Safari's cookies but not
 * its IndexedDB, so it is suggested only when the outbox is empty; on Android the queue survives installation.
 */
export function installOffer({ standalone, ios, inApp, canPrompt, outboxEmpty, dismissed }: InstallFacts): InstallOffer {
  if (standalone || dismissed || inApp) return "none";
  if (canPrompt) return "prompt";
  if (ios) return outboxEmpty ? "ios-steps" : "ios-wait";
  return "none";
}

interface HintFacts {
  offer: InstallOffer;
  /** Expenses this device has written in the trip. */
  createdHere: number;
  hintShown: boolean;
}

/** The hint that comes once, after the third expense, when installing is something to suggest. */
export const shouldHintInstall = ({ offer, createdHere, hintShown }: HintFacts): boolean =>
  !hintShown && createdHere >= 3 && (offer === "prompt" || offer === "ios-steps");

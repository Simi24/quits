import { describe, expect, it } from "vitest";
import { installOffer, shouldHintInstall } from "./install-offer";
import type { InstallFacts } from "./install-offer";

const facts: InstallFacts = { standalone: false, ios: false, inApp: false, canPrompt: false, outboxEmpty: true, dismissed: false };

describe("what the install card offers (SPEC.md §5.6)", () => {
  it("offers the browser's own prompt where it is available", () => {
    expect(installOffer({ ...facts, canPrompt: true })).toBe("prompt");
  });

  it("offers the queue to survive installation on Android: a full outbox does not matter there", () => {
    expect(installOffer({ ...facts, canPrompt: true, outboxEmpty: false })).toBe("prompt");
  });

  it("on iOS, with nothing waiting, explains Share and Add to Home Screen", () => {
    expect(installOffer({ ...facts, ios: true })).toBe("ios-steps");
  });

  it("on iOS, with changes waiting, asks to wait: the installed app cannot see Safari's queue", () => {
    expect(installOffer({ ...facts, ios: true, outboxEmpty: false })).toBe("ios-wait");
  });

  it.each([
    ["the app is already installed", { standalone: true, canPrompt: true }],
    ["the card was dismissed", { canPrompt: true, dismissed: true }],
    ["it is an in-app browser, which cannot install", { ios: true, inApp: true }],
    ["the browser offers nothing and it is not iOS", {}],
  ] as [string, Partial<InstallFacts>][])("offers nothing when %s", (_label, change) => {
    expect(installOffer({ ...facts, ...change })).toBe("none");
  });
});

describe("the one-time hint after the third expense", () => {
  const ready = { offer: "prompt" as const, createdHere: 3, hintShown: false };

  it("shows once, at the third expense this device wrote", () => expect(shouldHintInstall(ready)).toBe(true));
  it("waits for the third", () => expect(shouldHintInstall({ ...ready, createdHere: 2 })).toBe(false));
  it("never shows twice", () => expect(shouldHintInstall({ ...ready, hintShown: true })).toBe(false));
  it("does not nag when there is nothing to offer", () => expect(shouldHintInstall({ ...ready, offer: "none" })).toBe(false));
  it("does not suggest installing with a queue on iOS", () => expect(shouldHintInstall({ ...ready, offer: "ios-wait" })).toBe(false));
});

import { describe, expect, it } from "vitest";
import { isPrivacyPath, PRIVACY_PATH } from "./route";

describe("isPrivacyPath", () => {
  it("matches the privacy page, with or without a trailing slash", () => {
    expect(isPrivacyPath(PRIVACY_PATH)).toBe(true);
    expect(isPrivacyPath("/privacy/")).toBe(true);
  });

  it("does not match the landing, a trip link or look-alikes", () => {
    for (const path of ["/", "/v/", "/privacy-policy", "/privacy/x", "/api/privacy"]) expect(isPrivacyPath(path)).toBe(false);
  });
});

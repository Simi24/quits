import { describe, expect, it } from "vitest";
import { isLandingPath } from "./beacon";

describe("isLandingPath", () => {
  it("is true only for the bare landing", () => {
    expect(isLandingPath("/")).toBe(true);
    for (const path of ["/v", "/v/", "/v/anything", "/privacy", "/privacy/"]) expect(isLandingPath(path), path).toBe(false);
  });
});

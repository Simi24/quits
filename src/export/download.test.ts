import { describe, expect, it } from "vitest";
import { fileSlug } from "./download";

describe("fileSlug", () => {
  it("turns a trip name into a safe file name", () => {
    expect(fileSlug("Sardegna 2026")).toBe("sardegna-2026");
    expect(fileSlug("Città d'estate!")).toBe("citta-d-estate");
  });
  it("never comes out empty", () => {
    expect(fileSlug("???")).toBe("viaggio");
  });
});

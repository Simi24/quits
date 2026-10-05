import { describe, expect, it } from "vitest";
import { expenseCreated, tripCreated } from "../../domain/testing";
import { buildBackup } from "./backup";

describe("buildBackup", () => {
  const operations = [tripCreated(), expenseCreated("e1")];
  const backup = JSON.parse(buildBackup({ tripId: "trip-1", operations, exportedAt: "2026-07-01T10:00:00.000Z" }));

  it("carries every operation, in order, exactly as written", () => {
    expect(backup.operations).toEqual(operations);
  });

  it("says what it is, whose it is and when it was made", () => {
    expect(backup).toMatchObject({ app: "quits", format: 1, tripId: "trip-1", exportedAt: "2026-07-01T10:00:00.000Z" });
  });

  it("never carries the trip link", () => {
    expect(Object.keys(backup).sort()).toEqual(["app", "exportedAt", "format", "operations", "tripId"]);
  });
});

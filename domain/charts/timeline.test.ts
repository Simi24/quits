import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline.ts";
import { sardegnaUntil, tripWith } from "./testing.ts";

describe("the day axis", () => {
  it("runs from the start date to the end date, inclusive", () => {
    const tl = buildTimeline(sardegnaUntil(), "2026-06-21");
    expect(tl.dates[0]).toBe("2026-06-13");
    expect(tl.dates.at(-1)).toBe("2026-06-20");
    expect(tl.dates).toHaveLength(8);
    expect(tl.phase).toBe("ended");
    expect(tl.elapsed).toBe(8);
    expect(tl.hasPre).toBe(false);
  });

  it("knows which day it is during the trip, and shades the rest", () => {
    const tl = buildTimeline(sardegnaUntil(), "2026-06-16");
    expect(tl).toMatchObject({ phase: "running", elapsed: 4, todayIndex: 3 });
  });

  it("before the start there is no day elapsed and it says when the trip begins", () => {
    const tl = buildTimeline(sardegnaUntil(), "2026-06-01");
    expect(tl).toMatchObject({ phase: "before", elapsed: 0, todayIndex: null, startsOn: "2026-06-13" });
  });

  it("treats a trip without today's date as over", () => {
    expect(buildTimeline(sardegnaUntil(), null).phase).toBe("ended");
  });

  it("spans first to last expense for an undated trip, with no today", () => {
    const trip = tripWith({ from: null, to: null }, [
      { id: "a", date: "2026-07-02", amount: 1000 },
      { id: "b", date: "2026-07-05", amount: 1000 },
    ]);
    const tl = buildTimeline(trip, "2026-07-03");
    expect(tl.dates).toEqual(["2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"]);
    expect(tl).toMatchObject({ phase: "undated", todayIndex: null, elapsed: 4 });
  });

  it("treats a trip with only one of the two dates as undated", () => {
    const trip = tripWith({ from: "2026-07-01", to: null }, [{ id: "a", date: "2026-07-03", amount: 1000 }]);
    expect(buildTimeline(trip, "2026-07-02").phase).toBe("undated");
  });

  it("puts expenses dated before the start in a bucket of their own, outside the days", () => {
    const trip = tripWith({ from: "2026-07-01", to: "2026-07-03" }, [
      { id: "booking", date: "2026-05-20", amount: 5000 },
      { id: "dinner", date: "2026-07-02", amount: 1000 },
    ]);
    const tl = buildTimeline(trip, "2026-07-10");
    expect(tl.hasPre).toBe(true);
    expect(tl.dates).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
  });

  it("stretches the axis to an expense dated after the end, so no money disappears", () => {
    const trip = tripWith({ from: "2026-07-01", to: "2026-07-02" }, [{ id: "late", date: "2026-07-04", amount: 1000 }]);
    expect(buildTimeline(trip, null).dates.at(-1)).toBe("2026-07-04");
  });

  it("has no days at all for an undated trip without expenses", () => {
    expect(buildTimeline(tripWith({ from: null, to: null }, []), null).dates).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { categoryColor, listCategories, resolveCategory, STANDARD_CATEGORIES, foldTrip } from "./index.ts";
import { expense, expenseCreated, op, sequence, tripCreated } from "./testing.ts";

const fold = (...ops: ReturnType<typeof op>[]) => foldTrip(sequence([tripCreated(), ...ops]));
const addCategory = (id: string, name = "Aperitivi", emoji = "🍹") => op({ type: "CategoryAdded", categoryId: id, name, emoji });

describe("standard categories", () => {
  it("are the six of the spec, translated, each with an emoji and a colour", () => {
    expect(STANDARD_CATEGORIES.map((c) => [c.id, c.emoji, c.color, c.names.it, c.names.en])).toEqual([
      ["accommodation", "🏠", "pool", "Alloggio", "Accommodation"],
      ["transport", "🚗", "sun", "Trasporti", "Transport"],
      ["restaurants", "🍝", "coral", "Ristoranti", "Restaurants"],
      ["groceries", "🛒", "leaf", "Spesa", "Groceries"],
      ["activities", "🤿", "sea", "Attività", "Activities"],
      ["other", "📦", "stone", "Altro", "Other"],
    ]);
  });

  it("resolve an expense without a known category to Other", () => {
    expect(resolveCategory(fold(), "no-such-thing")).toMatchObject({ id: "other", kind: "standard" });
  });
});

describe("custom categories", () => {
  it("are added with a name and an emoji, never translated", () => {
    const trip = fold(addCategory("c-aperitivi"));
    expect(resolveCategory(trip, "c-aperitivi")).toMatchObject({ id: "c-aperitivi", kind: "custom", name: "Aperitivi", emoji: "🍹", textured: true });
    expect(listCategories(trip).map((c) => c.id)).toEqual([...STANDARD_CATEGORIES.map((c) => c.id), "c-aperitivi"]);
  });

  it("get the default emoji when it is left empty", () => {
    expect(resolveCategory(fold(addCategory("c1", "Varie", "")), "c1").emoji).toBe("🏷️");
  });

  it("take their colour from a stable hash of the id", () => {
    expect(categoryColor("c-aperitivi")).toBe("coral");
    expect(categoryColor("a")).toBe("sea");
    expect(categoryColor("abc")).toBe("sun");
    expect(resolveCategory(fold(addCategory("c-aperitivi")), "c-aperitivi").color).toBe("coral");
  });

  it("can be renamed, and the standard ones cannot", () => {
    const trip = fold(addCategory("c1"), op({ type: "CategoryRenamed", categoryId: "c1", name: "Spritz", emoji: "🥂" }), op({ type: "CategoryRenamed", categoryId: "other", name: "Boh", emoji: "?" }, { id: "rename-std" }));
    expect(resolveCategory(trip, "c1")).toMatchObject({ name: "Spritz", emoji: "🥂" });
    expect(resolveCategory(trip, "other").names).toEqual({ it: "Altro", en: "Other" });
    expect(trip.history.find((h) => h.opId === "rename-std")?.ignored).toBe("unknown_target");
  });

  it("moves their expenses to Other when deleted, without touching the expenses", () => {
    const trip = fold(addCategory("c1"), expenseCreated("e1", expense({ categoryId: "c1" })), op({ type: "CategoryDeleted", categoryId: "c1" }));
    expect(resolveCategory(trip, trip.expenses[0]!.snapshot.categoryId).id).toBe("other");
    expect(trip.expenses[0]!.snapshot.categoryId).toBe("c1");
    expect(listCategories(trip).map((c) => c.id)).not.toContain("c1");
  });

  it("cannot reuse the id of a standard category", () => {
    const trip = fold(addCategory("other", "Mio"));
    expect(resolveCategory(trip, "other").names?.en).toBe("Other");
  });
});

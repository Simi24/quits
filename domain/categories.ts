import type { Trip } from "./trip.ts";

export type CategoryColor = "pool" | "sun" | "coral" | "leaf" | "sea" | "stone";

export const OTHER_CATEGORY_ID = "other";
export const DEFAULT_CUSTOM_EMOJI = "🏷️";

/** The six every trip has, in the order of the prototypes. Names are translated; ids are stored in expenses. */
export const STANDARD_CATEGORIES = [
  { id: "accommodation", emoji: "🏠", color: "pool", names: { it: "Alloggio", en: "Accommodation" } },
  { id: "transport", emoji: "🚗", color: "sun", names: { it: "Trasporti", en: "Transport" } },
  { id: "restaurants", emoji: "🍝", color: "coral", names: { it: "Ristoranti", en: "Restaurants" } },
  { id: "groceries", emoji: "🛒", color: "leaf", names: { it: "Spesa", en: "Groceries" } },
  { id: "activities", emoji: "🤿", color: "sea", names: { it: "Attività", en: "Activities" } },
  { id: OTHER_CATEGORY_ID, emoji: "📦", color: "stone", names: { it: "Altro", en: "Other" } },
] as const satisfies readonly {
  id: string;
  emoji: string;
  color: CategoryColor;
  names: { it: string; en: string };
}[];

const HASH_COLORS = ["pool", "sun", "coral", "leaf", "sea"] as const;

/** Custom categories get a colour from a stable hash of their id (SPEC.md §3.12), the same on every device. */
export function categoryColor(id: string): CategoryColor {
  const hash = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return HASH_COLORS[hash % HASH_COLORS.length]!;
}

export type ResolvedCategory = {
  id: string;
  kind: "standard" | "custom";
  emoji: string;
  color: CategoryColor;
  /** Custom categories always carry a texture in charts (SPEC.md §3.12). */
  textured: boolean;
  /** Custom categories: the name as typed, never translated. */
  name: string | null;
  /** Standard categories: the translated names. */
  names: { it: string; en: string } | null;
};

const standard = (c: (typeof STANDARD_CATEGORIES)[number]): ResolvedCategory => ({
  id: c.id,
  kind: "standard",
  emoji: c.emoji,
  color: c.color,
  textured: false,
  name: null,
  names: c.names,
});

/** The category an expense belongs to. An unknown or deleted one is Other. */
export function resolveCategory(trip: Trip, id: string): ResolvedCategory {
  const std = STANDARD_CATEGORIES.find((c) => c.id === id);
  if (std) return standard(std);
  const custom = trip.categories.find((c) => c.id === id);
  if (custom) {
    return { id, kind: "custom", emoji: custom.emoji, color: categoryColor(id), textured: true, name: custom.name, names: null };
  }
  return standard(STANDARD_CATEGORIES[STANDARD_CATEGORIES.length - 1]!);
}

/** Standard categories, then the trip's own in the order they were added. */
export const listCategories = (trip: Trip): ResolvedCategory[] => [
  ...STANDARD_CATEGORIES.map(standard),
  ...trip.categories.map((c) => resolveCategory(trip, c.id)),
];

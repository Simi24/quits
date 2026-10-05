import type { ResolvedCategory } from "../../../domain";

export type TextureId = "a" | "b" | "c" | "d" | "e" | "x";

/** The SVG pattern each standard category gets when "Motivi" is on (SPEC.md §8.5). Alloggio stays plain: the others carry the difference. */
const STANDARD: Record<string, TextureId | null> = {
  groceries: "a",
  accommodation: null,
  restaurants: "b",
  activities: "d",
  transport: "x",
  other: "c",
};

/**
 * Custom categories always carry a texture, whatever the toggle says: their hash colour can repeat a standard one.
 * With "Motivi" on they get their own pattern, off a plain one that no standard category shares at the same hue.
 */
export const textureOf = (category: ResolvedCategory, patterns: boolean): TextureId | null =>
  category.kind === "custom" ? (patterns ? "e" : "b") : patterns ? (STANDARD[category.id] ?? null) : null;

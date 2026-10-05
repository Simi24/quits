import { DEFAULT_CUSTOM_EMOJI, STANDARD_CATEGORIES } from "../categories.ts";
import type { Handlers } from "./context.ts";

const isStandard = (id: string) => STANDARD_CATEGORIES.some((c) => c.id === id);
const emojiOf = (emoji: string) => emoji.trim() || DEFAULT_CUSTOM_EMOJI;

export const categoryHandlers: Handlers = {
  CategoryAdded({ trip, ignore }, op) {
    if (isStandard(op.categoryId) || trip.categories.some((c) => c.id === op.categoryId)) {
      return ignore("unknown_target");
    }
    trip.categories.push({ id: op.categoryId, name: op.name, emoji: emojiOf(op.emoji) });
  },
  CategoryRenamed({ trip, ignore }, op) {
    const category = trip.categories.find((c) => c.id === op.categoryId);
    if (!category) return ignore("unknown_target");
    category.name = op.name;
    category.emoji = emojiOf(op.emoji);
  },
  /** Its expenses are not rewritten: they read as Other from now on. */
  CategoryDeleted({ trip, ignore }, op) {
    if (!trip.categories.some((c) => c.id === op.categoryId)) return ignore("unknown_target");
    trip.categories = trip.categories.filter((c) => c.id !== op.categoryId);
  },
};

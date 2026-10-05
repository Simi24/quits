import type { CategoryColor } from "../../domain";

/** Literal class names, so Tailwind sees them: the soft tint behind a category emoji (SPEC.md §7.2). */
export const CATEGORY_TINT: Record<CategoryColor, string> = {
  pool: "bg-[color-mix(in_srgb,var(--pool)_32%,var(--receipt))]",
  sun: "bg-[color-mix(in_srgb,var(--sun)_32%,var(--receipt))]",
  coral: "bg-[color-mix(in_srgb,var(--coral)_32%,var(--receipt))]",
  leaf: "bg-[color-mix(in_srgb,var(--leaf)_32%,var(--receipt))]",
  sea: "bg-[color-mix(in_srgb,var(--sea)_32%,var(--receipt))]",
  stone: "bg-[color-mix(in_srgb,var(--stone)_32%,var(--receipt))]",
};

/** The avatar colours cycle by order of entry (SPEC.md §7.2). */
export const AVATAR_TINT = [
  "bg-[color-mix(in_srgb,var(--coral)_40%,var(--receipt))]",
  "bg-[color-mix(in_srgb,var(--pool)_40%,var(--receipt))]",
  "bg-[color-mix(in_srgb,var(--sun)_40%,var(--receipt))]",
  "bg-[color-mix(in_srgb,var(--leaf)_40%,var(--receipt))]",
  "bg-[color-mix(in_srgb,var(--sea)_40%,var(--receipt))]",
] as const;

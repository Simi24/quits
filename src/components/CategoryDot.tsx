import type { ReactNode } from "react";
import type { CategoryColor } from "../../domain";
import { CATEGORY_TINT } from "./categoryTint";

interface CategoryDotProps {
  color: CategoryColor;
  children: ReactNode;
}

/** The round mark with a category's emoji: the only place emoji appear (SPEC.md §7.11). */
export const CategoryDot = ({ color, children }: CategoryDotProps) => (
  <span aria-hidden="true" className={`grid size-11 flex-none place-items-center rounded-full text-[21px] leading-none ${CATEGORY_TINT[color]}`}>
    {children}
  </span>
);

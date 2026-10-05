import type { KeyboardEvent } from "react";

/** Arrow keys move between the marks of a list chart (`[data-mark]` buttons), Home and End jump to the ends (SPEC.md §8.4). */
export function arrowNav(event: KeyboardEvent<HTMLElement>) {
  const marks = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-mark]")];
  const at = marks.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  const step = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 0;
  const target = event.key === "Home" ? 0 : event.key === "End" ? marks.length - 1 : at + step;
  if (!step && event.key !== "Home" && event.key !== "End") return;
  event.preventDefault();
  marks[Math.min(marks.length - 1, Math.max(0, target))]?.focus();
}

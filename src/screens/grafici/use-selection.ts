import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

/**
 * What a chart reads out (SPEC.md §8.4). A mark is selected by tap, focus or click (pinned) and previewed by a mouse hover;
 * a touch never hovers. A pointer down anywhere outside the chart clears the pin.
 */
export function useSelection<K extends string | number>() {
  const ref = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState<K | null>(null);
  const [hovered, setHovered] = useState<K | null>(null);

  useEffect(() => {
    if (pinned === null) return;
    const outside = (event: globalThis.PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setPinned(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [pinned]);

  const mark = (key: K) => ({
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === "mouse") setHovered(key);
    },
    onPointerLeave: () => setHovered(null),
    onFocus: () => setPinned(key),
    onClick: () => setPinned(key),
  });

  return { ref, active: hovered ?? pinned, pinned, setPinned, setHovered, mark };
}

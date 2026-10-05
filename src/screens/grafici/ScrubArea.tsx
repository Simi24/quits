import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

interface ScrubAreaProps {
  /** Left edge and width of the plotted area, in SVG units. */
  x: number;
  width: number;
  height: number;
  count: number;
  /** Which mark an x position (relative to the svg) falls on. */
  indexAt: (x: number) => number;
  /** Where the keyboard starts when nothing is selected. */
  start: number;
  selected: number | null;
  onPin: (index: number) => void;
  onHover: (index: number | null) => void;
  label: string;
  valueText: string;
}

/**
 * The one control of a time chart: a slider over the plot. Mouse hover previews, a touch or a click selects, a drag scrubs,
 * arrow keys step (SPEC.md §8.4). Home and End jump to the ends.
 */
export const ScrubArea = ({ x, width, height, count, indexAt, start, selected, onPin, onHover, label, valueText }: ScrubAreaProps) => {
  const fromPointer = useRef(false);
  const at = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    return Math.min(count - 1, Math.max(0, indexAt(event.clientX - box.left)));
  };
  const onKeyDown = (event: KeyboardEvent<SVGRectElement>) => {
    const current = selected ?? start;
    const next = event.key === "ArrowRight" || event.key === "ArrowUp" ? current + 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? current - 1 : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : null;
    if (next === null) return;
    event.preventDefault();
    onPin(Math.min(count - 1, Math.max(0, next)));
  };
  return (
    <rect
      className="hit"
      x={x}
      y={0}
      width={width}
      height={height}
      tabIndex={0}
      role="slider"
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, count - 1)}
      aria-valuenow={selected ?? start}
      aria-valuetext={valueText}
      data-testid="scrub"
      onPointerDown={(event) => {
        fromPointer.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        onPin(at(event));
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse" && event.buttons === 0) onHover(at(event));
        else if (event.buttons > 0 || event.pointerType === "touch") onPin(at(event));
      }}
      onPointerLeave={() => onHover(null)}
      onFocus={() => {
        if (fromPointer.current) fromPointer.current = false;
        else if (selected === null) onPin(start);
      }}
      onKeyDown={onKeyDown}
    />
  );
};

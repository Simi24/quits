import { useMemo } from "react";
import { useDevice } from "../../device";
import type { ReadoutData } from "./readout";

interface ReadoutRowProps {
  data: ReadoutData | null;
  /** Charts with several marks show the hint until one is selected. */
  hintKind?: "mark" | "scrub";
}

const hoverCapable = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

/** The fixed row under a chart where values appear: never a tooltip a finger can cover (SPEC.md §8.4). */
export const ReadoutRow = ({ data, hintKind = "mark" }: ReadoutRowProps) => {
  const { t } = useDevice();
  const hover = useMemo(hoverCapable, []);
  const hint = hintKind === "scrub" ? (hover ? t.charts.hintScrubHover : t.charts.hintScrub) : hover ? t.charts.hintMarkHover : t.charts.hintMark;
  return (
    <div data-testid="readout" className="readout">
      {data ? (
        <>
          <div className="text-[12.5px] text-ink-2">{data.title}</div>
          {data.value ? <div className="num text-[17px] leading-tight font-bold">{data.value}</div> : null}
          {data.rows?.map((row) => (
            <div key={row.label} className="num mt-0.5 grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2 text-[13.5px]">
              <i aria-hidden="true" className="h-[3px] rounded-sm" style={{ background: row.color }} />
              <span className="truncate text-ink-2">{row.label}</span>
              <b className="font-bold">{row.value}</b>
            </div>
          ))}
          {data.notes?.map((note) => (
            <div key={note} className="mt-1 text-[12.5px] text-ink-2">
              {note.charAt(0).toUpperCase() + note.slice(1)}
            </div>
          ))}
        </>
      ) : (
        <div className="text-[13px] text-ink-2">{hint}</div>
      )}
    </div>
  );
};

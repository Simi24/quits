interface EqualMarkProps {
  width?: number;
  barHeight?: number;
}

/** The "=" brand mark: two equal bars, sun yellow over coral (SPEC.md §7.1). */
export const EqualMark = ({ width = 74, barHeight = 15 }: EqualMarkProps) => (
  <span
    aria-hidden="true"
    className="inline-grid flex-none"
    style={{ width, gap: barHeight * 0.9 }}
  >
    <i className="block rounded-full bg-hi" style={{ height: barHeight }} />
    <i className="block rounded-full bg-lead" style={{ height: barHeight }} />
  </span>
);

interface EqualMarkProps {
  width?: number;
  barHeight?: number;
  /** "Open" (bars tilted) while a balance is not zero; it closes when it reaches zero (SPEC.md §7.4). */
  open?: boolean;
  /** One colour taken from the text, for the balance rows. */
  mono?: boolean;
}

const BAR = "block rounded-full transition-transform duration-500 ease-[cubic-bezier(.3,.8,.3,1.3)]";

/** The "=" brand mark: two equal bars, sun yellow over coral (SPEC.md §7.1). */
export const EqualMark = ({ width = 74, barHeight = 15, open = false, mono = false }: EqualMarkProps) => (
  <span aria-hidden="true" className="inline-grid flex-none" style={{ width, gap: barHeight * 0.9 }}>
    <i className={`${BAR} ${mono ? "bg-current" : "bg-hi"} ${open ? "translate-x-[30%] -rotate-9" : ""}`} style={{ height: barHeight }} />
    <i className={`${BAR} ${mono ? "bg-current" : "bg-lead"} ${open ? "-translate-x-[22%] rotate-7" : ""}`} style={{ height: barHeight }} />
  </span>
);

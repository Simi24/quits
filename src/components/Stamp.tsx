interface StampProps {
  children: string;
  /** The big stamp of the celebration; it lands with `thunk` (SPEC.md §7.9). */
  big?: boolean;
}

/** The PARI stamp: small on the hero receipt, big on the celebration ticket. */
export const Stamp = ({ children, big = false }: StampProps) => (
  <div
    className={`display -rotate-8 justify-self-start rounded-[10px] border-stamp text-stamp outline-stamp ${
      big
        ? "anim-thunk justify-self-center rounded-[18px] border-[5px] px-[22px] pt-2.5 pb-2 text-[calc(58px*var(--d-scale))] leading-none tracking-[.04em] outline-2 outline-offset-4"
        : "border-[3px] px-3 pt-1.5 pb-1 text-[calc(26px*var(--d-scale))] leading-none tracking-[.04em] outline-[1.5px] outline-offset-[3px]"
    }`}
  >
    {children}
  </div>
);

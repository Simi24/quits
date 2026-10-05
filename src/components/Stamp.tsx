/** The PARI stamp, small: shown when everyone is even (the full celebration is S6). */
export const Stamp = ({ children }: { children: string }) => (
  <div className="display -rotate-8 justify-self-start rounded-[10px] border-[3px] border-stamp px-3 pt-1.5 pb-1 text-[calc(26px*var(--d-scale))] leading-none tracking-[.04em] text-stamp outline-[1.5px] outline-offset-[3px] outline-stamp">
    {children}
  </div>
);

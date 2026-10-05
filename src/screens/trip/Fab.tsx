import { Plus } from "@phosphor-icons/react";

/** The fixed "+" on Spese: a 62 px coral disc with the 4 px press shadow (SPEC.md §7.5). */
export const Fab = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="absolute right-[18px] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-10 grid size-[62px] place-items-center rounded-full bg-lead text-on-lead shadow-[0_4px_0_var(--lead-deep)] transition-transform duration-200 ease-[cubic-bezier(.3,.7,.4,1.5)] active:translate-y-[3px] active:shadow-[0_1px_0_var(--lead-deep)]"
  >
    <Plus size={28} weight="bold" aria-hidden="true" />
  </button>
);

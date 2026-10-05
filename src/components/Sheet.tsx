import { X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useDevice } from "../device";
import { IconButton } from "./IconButton";
import { useModalFocus } from "./useModalFocus";

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Fixed under the scrolling body: the primary action and the errors. */
  footer?: ReactNode;
}

/** A sheet that rises from the bottom, with 28 px top corners (SPEC.md §7.4). */
export const Sheet = ({ title, onClose, children, footer }: SheetProps) => {
  const { t } = useDevice();
  const ref = useModalFocus<HTMLDivElement>(onClose);
  return (
    <div
      className="anim-fade absolute inset-0 z-30 flex flex-col justify-end bg-[color-mix(in_srgb,var(--ink)_38%,transparent)]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="anim-rise flex max-h-[calc(100%-28px)] flex-col overflow-hidden overflow-x-clip rounded-t-[28px] bg-paper"
      >
        <div className="mx-auto mt-2 h-[5px] w-10 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-center gap-2 pt-2.5 pr-2 pb-1.5 pl-[18px]">
          <h2 className="display flex-1 text-[calc(22px*var(--d-scale))]">{title}</h2>
          <IconButton label={t.shell.close} onClick={onClose}>
            <X size={22} weight="bold" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <div className="grid gap-2 border-t-[1.5px] border-line bg-paper px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">{footer}</div> : null}
      </div>
    </div>
  );
};

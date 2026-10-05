import { CaretLeft } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useDevice } from "../device";
import { IconButton } from "./IconButton";
import { useModalFocus } from "./useModalFocus";

interface OverlayProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** A full-screen page that pushes in over the tabs: the expense detail (SPEC.md §7.9). */
export const Overlay = ({ title, onClose, children }: OverlayProps) => {
  const { t } = useDevice();
  const ref = useModalFocus<HTMLDivElement>(onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="anim-push absolute inset-0 z-20 flex flex-col bg-paper">
      <header className="flex items-center gap-1 py-2.5 pr-2 pl-1">
        <IconButton label={t.shell.back} onClick={onClose}>
          <CaretLeft size={22} weight="bold" />
        </IconButton>
        <h1 className="display flex-1 text-[calc(23px*var(--d-scale))]">{title}</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
};

import type { ReactNode } from "react";
import { EqualMark, Receipt } from "../../components";

interface LinkNoticeProps {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
}

/** A full page for a link that does not lead into a live trip: one receipt that says why, and what to do (SPEC.md §7.6 items 15 and 16). */
export const LinkNotice = ({ icon, title, children, actions }: LinkNoticeProps) => (
  <main className="grid h-full content-start gap-5 overflow-y-auto px-4 pt-9 pb-8">
    <div className="flex items-center gap-3">
      <EqualMark width={34} barHeight={7} />
      <span className="display text-[calc(30px*var(--d-scale))]">quits</span>
    </div>
    <Receipt className="grid gap-3.5 px-[22px] py-[34px]">
      <span aria-hidden="true">{icon}</span>
      <h1 className="display text-[calc(34px*var(--d-scale))] leading-[1.05]">{title}</h1>
      {children}
    </Receipt>
    <div className="grid gap-2.5">{actions}</div>
  </main>
);

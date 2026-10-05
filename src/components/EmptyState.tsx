import type { ReactNode } from "react";
import { Receipt } from "./Receipt";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  help: string;
}

/** What a screen will hold and how to start it: a small receipt with the screen's icon (SPEC.md §7.6). */
export const EmptyState = ({ icon, title, help }: EmptyStateProps) => (
  <div className="grid justify-items-center gap-2.5 px-5 py-8 text-center" data-testid="empty-state">
    <Receipt className="grid h-[90px] w-[120px] place-items-center">{icon}</Receipt>
    <b>{title}</b>
    <p className="max-w-[34ch] text-sm text-ink-2">{help}</p>
  </div>
);

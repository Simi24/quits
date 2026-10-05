import type { ReactNode } from "react";

interface DetailRowProps {
  label: ReactNode;
  value: ReactNode;
}

/** A name, dotted leaders, an amount: the lines of a receipt. */
export const DetailRow = ({ label, value }: DetailRowProps) => (
  <div className="flex items-baseline justify-between gap-3 text-[15.5px]">
    <span>{label}</span>
    <span aria-hidden="true" className="min-w-3 flex-1 -translate-y-1 border-b-2 border-dotted border-line" />
    <span className="num">{value}</span>
  </div>
);

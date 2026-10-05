import { Warning } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/** A short warning or hint on a sun-tinted ground: duplicates, confirmations. */
export const Notice = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-[auto_1fr] gap-2.5 rounded-[14px] bg-[color-mix(in_srgb,var(--sun)_34%,var(--paper))] p-3.5 text-[14.5px]">
    <Warning size={20} weight="fill" className="mt-0.5" aria-hidden="true" />
    <div className="grid gap-2.5">{children}</div>
  </div>
);

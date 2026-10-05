import type { ReactNode } from "react";

interface ReceiptProps {
  children: ReactNode;
  className?: string;
  /** Prints in when the row is new (SPEC.md §7.9). */
  printing?: boolean;
}

/** A paper receipt with zig-zag edges and no radius: the signature object (SPEC.md §7.1). */
export const Receipt = ({ children, className = "", printing = false }: ReceiptProps) => (
  <div className="edge">
    <div className={`zz ${printing ? "anim-print" : ""} ${className}`}>{children}</div>
  </div>
);

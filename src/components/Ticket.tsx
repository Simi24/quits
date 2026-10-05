import type { ReactNode } from "react";

/** A stamped ticket with side notches: settlements and suggested settlements (SPEC.md §7.4). */
export const Ticket = ({ children }: { children: ReactNode }) => <div className="ticket">{children}</div>;

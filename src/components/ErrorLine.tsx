import { Warning } from "@phosphor-icons/react";

export const ErrorLine = ({ children }: { children: string }) => (
  <p className="flex items-start gap-1.5 text-sm font-semibold text-neg">
    <Warning size={18} weight="fill" className="mt-px flex-none" aria-hidden="true" />
    {children}
  </p>
);

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon-only controls need a name for assistive technology. */
  label: string;
  children: ReactNode;
}

export const IconButton = ({ label, className = "", type = "button", children, ...rest }: IconButtonProps) => (
  <button
    type={type}
    aria-label={label}
    className={`grid size-11 flex-none place-items-center rounded-full text-ink hover:bg-paper-2 ${className}`}
    {...rest}
  >
    {children}
  </button>
);

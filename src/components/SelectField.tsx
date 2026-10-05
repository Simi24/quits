import type { ReactNode, SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export const SelectField = ({ label, id, className = "", children, ...rest }: SelectFieldProps) => (
  <label className="grid min-w-0 gap-1.5" htmlFor={id}>
    <span className="text-sm font-semibold">{label}</span>
    <select
      id={id}
      className={`min-h-12 w-full rounded-[14px] border-[1.5px] border-line bg-receipt px-3.5 py-2.5 text-ink focus:border-ink focus:outline-none ${className}`}
      {...rest}
    >
      {children}
    </select>
  </label>
);

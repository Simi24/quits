import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** The label above the input is always visible: a placeholder is never the label. */
  hint?: string;
  hideLabel?: boolean;
}

export const TextField = ({ label, hint, hideLabel = false, id, className = "", ...rest }: TextFieldProps) => (
  <label className="grid min-w-0 gap-1.5" htmlFor={id}>
    <span className={hideLabel ? "sr-only" : "text-sm font-semibold"}>{label}</span>
    <input
      id={id}
      className={`min-h-12 w-full rounded-[14px] border-[1.5px] border-line bg-receipt px-3.5 py-2.5 text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none ${className}`}
      {...rest}
    />
    {hint ? <small className="text-[13.5px] text-ink-2">{hint}</small> : null}
  </label>
);

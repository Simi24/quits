import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  wide?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-lead text-on-lead shadow-[0_3px_0_var(--lead-deep)] active:not-disabled:translate-y-[2px] active:not-disabled:shadow-[0_1px_0_var(--lead-deep)]",
  ghost:
    "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--line)] active:not-disabled:translate-y-px active:not-disabled:shadow-[inset_0_0_0_1.5px_var(--ink-2)]",
  danger: "bg-neg text-receipt",
};

/** Controls are pills (SPEC.md §7.4). Primary buttons carry the 3 px press shadow. */
export const Button = ({ variant = "primary", size = "md", wide = false, className = "", type = "button", ...rest }: ButtonProps) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(.3,.7,.4,1.4)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${
      size === "md" ? "min-h-12 px-[22px] text-base" : "min-h-[38px] px-[15px] text-sm"
    } ${wide ? "w-full" : ""} ${VARIANT[variant]} ${className}`}
    {...rest}
  />
);

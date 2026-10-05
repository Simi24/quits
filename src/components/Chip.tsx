import type { ButtonHTMLAttributes } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
}

/** A pill the person toggles: category, payer, participant. */
export const Chip = ({ pressed, className = "", type = "button", children, ...rest }: ChipProps) => (
  <button
    type={type}
    aria-pressed={pressed}
    className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-[15px] font-semibold ${
      pressed ? "border-ink bg-ink text-receipt" : "border-line bg-receipt text-ink"
    } ${className}`}
    {...rest}
  >
    {children}
  </button>
);

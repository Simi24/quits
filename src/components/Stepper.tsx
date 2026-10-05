import { Minus, Plus } from "@phosphor-icons/react";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Names the person the stepper is for. */
  label: string;
}

/** A non-negative integer with two big buttons: shares in a split. */
export const Stepper = ({ value, onChange, label }: StepperProps) => (
  <div role="group" aria-label={label} className="flex h-[46px] items-center justify-between rounded-full border-[1.5px] border-line bg-receipt">
    <button type="button" aria-label="-1" disabled={value <= 0} onClick={() => onChange(value - 1)} className="grid size-11 place-items-center rounded-full disabled:opacity-40">
      <Minus size={16} weight="bold" />
    </button>
    <b className="num min-w-6 text-center" aria-live="polite">
      {value}
    </b>
    <button type="button" aria-label="+1" onClick={() => onChange(value + 1)} className="grid size-11 place-items-center rounded-full">
      <Plus size={16} weight="bold" />
    </button>
  </div>
);

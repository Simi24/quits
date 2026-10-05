interface SegmentedProps<V extends string> {
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  /** Small pills for a corner of the screen; the touch target stays 44 px through an invisible margin. */
  compact?: boolean;
}

export function Segmented<V extends string>({ options, value, onChange, label, compact = false }: SegmentedProps<V>) {
  return (
    <div role="group" aria-label={label} className="flex gap-[3px] rounded-full bg-paper-2 p-[3px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`relative flex-1 whitespace-nowrap rounded-full font-semibold ${
            compact ? "min-h-8 px-3 text-[13px] before:absolute before:-inset-x-0.5 before:-inset-y-1.5 before:content-['']" : "min-h-11 px-2.5 text-sm"
          } ${
            value === option.value ? "bg-receipt text-ink shadow-[0_1px_0_var(--line)]" : "text-ink-2"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

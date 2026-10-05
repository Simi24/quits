interface SegmentedProps<V extends string> {
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  label: string;
}

export function Segmented<V extends string>({ options, value, onChange, label }: SegmentedProps<V>) {
  return (
    <div role="group" aria-label={label} className="flex gap-[3px] rounded-full bg-paper-2 p-[3px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-11 flex-1 whitespace-nowrap rounded-full px-2.5 text-sm font-semibold ${
            value === option.value ? "bg-receipt text-ink shadow-[0_1px_0_var(--line)]" : "text-ink-2"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

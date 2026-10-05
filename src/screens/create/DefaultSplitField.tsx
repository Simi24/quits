import { Segmented, Stepper } from "../../components";
import { useDevice } from "../../device";

interface DefaultSplitFieldProps {
  people: string[];
  method: "equal" | "shares";
  shares: number[];
  onMethod: (method: "equal" | "shares") => void;
  onShares: (index: number, value: number) => void;
}

export const DefaultSplitField = ({ people, method, shares, onMethod, onShares }: DefaultSplitFieldProps) => {
  const { t } = useDevice();
  return (
    <div className="grid gap-2.5">
      <span className="text-sm font-semibold">{t.create.defSplit}</span>
      <Segmented
        label={t.create.defSplit}
        value={method}
        onChange={onMethod}
        options={[
          { value: "equal", label: t.create.equalAll },
          { value: "shares", label: t.create.byShares },
        ]}
      />
      <small className="text-[13.5px] text-ink-2">{t.create.defSplitHelp}</small>
      {method === "shares" ? (
        <ul className="grid gap-0.5">
          {people.map((name, i) => (
            <li key={`${name}-${i}`} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_132px] items-center gap-2.5">
              <span className="truncate font-semibold">{name}</span>
              <Stepper label={name} value={shares[i] ?? 1} onChange={(v) => onShares(i, v)} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

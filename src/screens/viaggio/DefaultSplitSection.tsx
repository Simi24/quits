import { useState } from "react";
import { Button, Segmented, Stepper } from "../../components";
import { useDevice } from "../../device";
import type { DefaultSplit } from "../../../domain";
import { useTrip } from "../../trip";
import { Setting } from "./Setting";

type Method = DefaultSplit["method"];

const sharesOf = (split: DefaultSplit, ids: string[]): Record<string, number> =>
  Object.fromEntries(ids.map((id) => [id, split.method === "shares" ? (split.shares[id] ?? 1) : 1]));

/** The default split a new expense is prefilled with: everyone equal, or by shares (SPEC.md §3.2). */
export const DefaultSplitSection = ({ onSaved }: { onSaved: () => void }) => {
  const { t } = useDevice();
  const { trip, record } = useTrip();
  const ids = trip.participants.map((p) => p.id);
  const [method, setMethod] = useState<Method>(trip.defaultSplit.method);
  const [shares, setShares] = useState(() => sharesOf(trip.defaultSplit, ids));

  const current = trip.defaultSplit;
  const summary =
    current.method === "shares"
      ? t.settings.defSharesSummary(trip.participants.map((p) => `${p.name} ${current.shares[p.id] ?? 1}`).join(", "))
      : t.settings.defEqual;
  const next: DefaultSplit = method === "shares" ? { method: "shares", shares: Object.fromEntries(ids.map((id) => [id, shares[id] ?? 1])) } : { method: "equal" };
  const changed = JSON.stringify(next) !== JSON.stringify(current);

  const save = async () => {
    await record({ type: "DefaultSplitChanged", defaultSplit: next });
    onSaved();
  };

  return (
    <Setting title={t.settings.defSplit}>
      <p className="text-sm" data-testid="default-split-summary">
        {summary}
      </p>
      <p className="text-[13.5px] text-ink-2">{t.create.defSplitHelp}</p>
      <Segmented<Method>
        label={t.settings.defSplit}
        value={method}
        onChange={setMethod}
        options={[
          { value: "equal", label: t.create.equalAll },
          { value: "shares", label: t.create.byShares },
        ]}
      />
      {method === "shares" ? (
        <ul className="grid gap-0.5">
          {trip.participants.map((p) => (
            <li key={p.id} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_132px] items-center gap-2.5">
              <span className="truncate font-semibold">{p.name}</span>
              <Stepper label={p.name} value={shares[p.id] ?? 1} onChange={(v) => setShares({ ...shares, [p.id]: v })} />
            </li>
          ))}
        </ul>
      ) : null}
      {changed ? (
        <Button size="sm" className="justify-self-start" onClick={() => void save()}>
          {t.settings.renameSave}
        </Button>
      ) : null}
    </Setting>
  );
};

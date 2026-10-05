import { UserPlus, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, ErrorLine, TextField } from "../../components";
import { useDevice } from "../../device";
import { NAME_MAX_LENGTH } from "../../../domain";

interface PeopleFieldProps {
  people: string[];
  onAdd: (name: string) => void;
  onRemove: (index: number) => void;
}

/** The participants of a new trip: yours first, duplicates refused (SPEC.md §7.6 item 2). */
export const PeopleField = ({ people, onAdd, onRemove }: PeopleFieldProps) => {
  const { t } = useDevice();
  const [draft, setDraft] = useState("");
  const duplicate = draft.trim() !== "" && people.some((p) => p.toLowerCase() === draft.trim().toLowerCase());
  const label = people.length ? t.create.addName : t.create.yourName;

  const add = () => {
    if (!draft.trim() || duplicate) return;
    onAdd(draft.trim());
    setDraft("");
  };

  return (
    <div className="grid gap-2.5">
      <span className="text-sm font-semibold">{t.create.participants}</span>
      <ul className="flex flex-wrap gap-2">
        {people.map((name, i) => (
          <li key={`${name}-${i}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-line bg-receipt pr-1.5 pl-3.5 font-semibold">
            {name}
            {i === 0 ? (
              <small className="pr-2 text-ink-2">({t.shell.you})</small>
            ) : (
              <button type="button" aria-label={`${t.create.remove} ${name}`} onClick={() => onRemove(i)} className="grid size-9 place-items-center rounded-full">
                <X size={16} weight="bold" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <div className="grow">
          <TextField id="new-person" label={label} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={NAME_MAX_LENGTH} autoComplete="off" />
        </div>
        <Button type="submit" variant="ghost" disabled={!draft.trim() || duplicate}>
          <UserPlus size={20} weight="fill" aria-hidden="true" />
          {t.create.add}
        </Button>
      </form>
      {duplicate ? <ErrorLine>{t.create.dupName}</ErrorLine> : null}
    </div>
  );
};

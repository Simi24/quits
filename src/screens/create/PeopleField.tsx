import { X } from "@phosphor-icons/react";
import { AddNameForm } from "../../components";
import { useDevice } from "../../device";

interface PeopleFieldProps {
  people: string[];
  onAdd: (name: string) => void;
  onRemove: (index: number) => void;
}

/** The participants of a new trip: yours first, duplicates refused (SPEC.md §7.6 item 2). */
export const PeopleField = ({ people, onAdd, onRemove }: PeopleFieldProps) => {
  const { t } = useDevice();
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
      <AddNameForm id="new-person" label={people.length ? t.create.addName : t.create.yourName} taken={people} onAdd={onAdd} />
    </div>
  );
};

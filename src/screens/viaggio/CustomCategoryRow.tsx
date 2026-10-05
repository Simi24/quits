import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, CategoryDot, IconButton, TextField } from "../../components";
import { useDevice } from "../../device";
import { categoryColor } from "../../../domain";
import type { CustomCategory } from "../../../domain";
import { useTrip } from "../../trip";

interface CustomCategoryRowProps {
  category: CustomCategory;
  onDeleted: () => void;
}

/** A category of this trip: rename, delete (its expenses move to Other, SPEC.md §3.12). */
export const CustomCategoryRow = ({ category, onDeleted }: CustomCategoryRowProps) => {
  const { t } = useDevice();
  const { record } = useTrip();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);

  const save = async () => {
    if (!name.trim()) return;
    if (name.trim() !== category.name) await record({ type: "CategoryRenamed", categoryId: category.id, name: name.trim(), emoji: category.emoji });
    setEditing(false);
  };
  const remove = async () => {
    await record({ type: "CategoryDeleted", categoryId: category.id });
    onDeleted();
  };

  if (editing) {
    return (
      <li className="flex min-h-[52px] items-end gap-2.5 py-1.5">
        <div className="grow">
          <TextField id={`rename-cat-${category.id}`} label={`${t.settings.rename} ${category.name}`} hideLabel value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>
        <Button disabled={!name.trim()} onClick={() => void save()}>
          {t.settings.renameSave}
        </Button>
      </li>
    );
  }
  return (
    <li className="flex min-h-[52px] items-center gap-2.5">
      <CategoryDot color={categoryColor(category.id)}>{category.emoji}</CategoryDot>
      <b className="grow">{category.name}</b>
      <IconButton label={`${t.settings.rename} ${category.name}`} onClick={() => setEditing(true)}>
        <PencilSimple size={20} weight="fill" aria-hidden="true" />
      </IconButton>
      <IconButton label={`${t.settings.del} ${category.name}`} onClick={() => void remove()}>
        <Trash size={20} weight="fill" aria-hidden="true" />
      </IconButton>
    </li>
  );
};

import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, TextField, useSingleFlight } from "../../components";
import { useDevice } from "../../device";
import { NAME_MAX_LENGTH, STANDARD_CATEGORIES } from "../../../domain";
import { useTrip } from "../../trip";
import { CustomCategoryRow } from "./CustomCategoryRow";
import { Setting } from "./Setting";

interface CategoriesSectionProps {
  notify: (text: string) => void;
}

/** Standard categories as chips, the trip's own as a list, add with emoji and name (SPEC.md §3.12). */
export const CategoriesSection = ({ notify }: CategoriesSectionProps) => {
  const { t, lang } = useDevice();
  const { trip, record } = useTrip();
  const [emoji, setEmoji] = useState("");
  const [name, setName] = useState("");

  const add = useSingleFlight(async () => {
    if (!name.trim()) return;
    await record({ type: "CategoryAdded", categoryId: crypto.randomUUID(), name: name.trim(), emoji: emoji.trim() });
    setName("");
    setEmoji("");
    notify(t.settings.catAdded);
  });

  return (
    <Setting title={t.settings.categories}>
      <p className="text-[13.5px] text-ink-2">{t.settings.stdCats}</p>
      <ul className="flex flex-wrap gap-2">
        {STANDARD_CATEGORIES.map((c) => (
          <li key={c.id} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-[1.5px] border-line bg-receipt px-3.5 text-[15px] font-semibold">
            <span aria-hidden="true" className="text-[17px] leading-none">
              {c.emoji}
            </span>
            {c.names[lang]}
          </li>
        ))}
      </ul>
      <p className="text-[13.5px] text-ink-2">{t.settings.customCats}</p>
      {trip.categories.length ? (
        <ul className="[&>li+li]:border-t-[1.5px] [&>li+li]:border-dashed [&>li+li]:border-line">
          {trip.categories.map((c) => (
            <CustomCategoryRow key={c.id} category={c} onDeleted={() => notify(t.settings.catDeleted)} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-2">{t.settings.noCustomCats}</p>
      )}
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void add.run();
        }}
      >
        <div className="w-[76px] flex-none">
          <TextField id="category-emoji" label={t.settings.catEmojiPh} value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🙂" maxLength={8} className="text-center" autoComplete="off" />
        </div>
        <div className="grow">
          <TextField id="category-name" label={t.settings.catNamePh} value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX_LENGTH} autoComplete="off" />
        </div>
        <Button type="submit" variant="ghost" aria-label={t.settings.addCat} disabled={!name.trim() || add.busy}>
          <Plus size={20} weight="bold" aria-hidden="true" />
        </Button>
      </form>
    </Setting>
  );
};

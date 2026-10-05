import { UserPlus } from "@phosphor-icons/react";
import { useState } from "react";
import { NAME_MAX_LENGTH } from "../../domain";
import { useDevice } from "../device";
import { Button } from "./Button";
import { ErrorLine } from "./ErrorLine";
import { TextField } from "./TextField";
import { useSingleFlight } from "./useSingleFlight";

interface AddNameFormProps {
  id: string;
  label: string;
  /** The names already in the trip; a new one may not repeat them, whatever the case ("Questo nome c'è già."). */
  taken: string[];
  onAdd: (name: string) => void | Promise<void>;
}

/** A name field and "Aggiungi": the participants of a new trip, and of an open one in Viaggio. */
export const AddNameForm = ({ id, label, taken, onAdd }: AddNameFormProps) => {
  const { t } = useDevice();
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const duplicate = trimmed !== "" && taken.some((n) => n.toLowerCase() === trimmed.toLowerCase());

  const add = useSingleFlight(async () => {
    if (!trimmed || duplicate) return;
    await onAdd(trimmed);
    setName("");
  });

  return (
    <>
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void add.run();
        }}
      >
        <div className="grow">
          <TextField id={id} label={label} value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX_LENGTH} autoComplete="off" />
        </div>
        <Button type="submit" variant="ghost" disabled={!trimmed || duplicate || add.busy}>
          <UserPlus size={20} weight="fill" aria-hidden="true" />
          {t.create.add}
        </Button>
      </form>
      {duplicate ? <ErrorLine>{t.create.dupName}</ErrorLine> : null}
    </>
  );
};

import { useState } from "react";
import { Button, ErrorLine, TextField } from "../../components";
import { useDevice } from "../../device";
import { tokenFromInput } from "../../trip";

interface OpenLinkFieldProps {
  onOpen: (token: string) => void;
}

/** "Apri o incolla un link di viaggio": a link opened after installing can land in the browser, so the app takes it too (SPEC.md §5.8). */
export const OpenLinkField = ({ onOpen }: OpenLinkFieldProps) => {
  const { t } = useDevice();
  const [text, setText] = useState("");
  const [bad, setBad] = useState(false);

  const submit = () => {
    const token = tokenFromInput(text);
    setBad(token === null);
    if (token) onOpen(token);
  };
  return (
    <section className="grid gap-3.5 border-t-2 border-dashed border-line px-4 py-7">
      <h2 className="display text-[calc(20px*var(--d-scale))]">{t.pwa.openLink}</h2>
      <p className="text-[13.5px] text-ink-2">{t.pwa.openLinkHelp}</p>
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grow">
          <TextField
            id="open-link"
            label={t.pwa.openLink}
            hideLabel
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setBad(false);
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
        <Button type="submit" variant="ghost" disabled={!text.trim()}>
          {t.pwa.openLinkAction}
        </Button>
      </form>
      <div role="status">{bad ? <ErrorLine>{t.pwa.openLinkBad}</ErrorLine> : null}</div>
    </section>
  );
};

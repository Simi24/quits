import { Check, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, ErrorLine, TextField, useSingleFlight } from "../../components";
import { useDevice } from "../../device";
import { api } from "../../sync/client";

interface CreatorCodeProps {
  onCreate: () => void;
}

type Problem = "wrong" | "offline" | "failed" | null;

/** "Hai un codice da creatore?": checked online once, then remembered by this device (SPEC.md §4). */
export const CreatorCode = ({ onCreate }: CreatorCodeProps) => {
  const { t, creatorCode, setCreatorCode } = useDevice();
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<Problem>(null);

  const check = useSingleFlight(async () => {
    const typed = code.trim();
    if (!typed) return;
    const answer = await api.checkCode(typed);
    if (answer.kind === "ok") {
      setProblem(null);
      setCreatorCode(typed);
    } else if (answer.kind === "forbidden") setProblem("wrong");
    else if (answer.kind === "offline") setProblem("offline");
    else setProblem("failed");
  });

  const message = { wrong: t.sync.codeErr, offline: t.sync.codeOffline, failed: t.sync.codeFailed };

  return (
    <section className="grid gap-3.5 border-t-2 border-dashed border-line px-4 py-7">
      <h2 className="display text-[calc(20px*var(--d-scale))]">{t.sync.creatorQ}</h2>
      {creatorCode ? (
        <>
          <p className="flex items-center gap-1.5 font-semibold">
            <Check size={20} weight="bold" aria-hidden="true" />
            {t.sync.codeOk}
          </p>
          <Button wide onClick={onCreate}>
            <Plus size={20} weight="bold" aria-hidden="true" />
            {t.shell.createTrip}
          </Button>
        </>
      ) : (
        <>
          <p className="text-[13.5px] text-ink-2">{t.sync.creatorHelp}</p>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void check.run();
            }}
          >
            <div className="grow">
              <TextField id="creator-code" label={t.sync.creatorQ} hideLabel placeholder={t.sync.codePh} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
            </div>
            <Button type="submit" variant="ghost" disabled={check.busy || !code.trim()}>
              {t.sync.useCode}
            </Button>
          </form>
          <div role="status">{problem ? <ErrorLine>{message[problem]}</ErrorLine> : null}</div>
        </>
      )}
    </section>
  );
};

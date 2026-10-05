import { ArrowUUpLeft } from "@phosphor-icons/react";
import { Button } from "../../components";
import { useDevice } from "../../device";
import { instantTime, listNames } from "../../format";
import { versionChange } from "../../history";
import type { ExpenseRecord, ExpenseVersion } from "../../../domain";
import { useTrip } from "../../trip";

interface ExpenseVersionsProps {
  expense: ExpenseRecord;
  onRestored: () => void;
}

/** "Modifiche": the versions of one expense, newest first, with what each changed and "Ripristina questa versione" (SPEC.md §3.15, §3.14). */
export const ExpenseVersions = ({ expense, onRestored }: ExpenseVersionsProps) => {
  const { t, lang } = useDevice();
  const { money, nameOf, record, readOnly } = useTrip();
  const { versions } = expense;
  const latest = versions.at(-1);

  const what = (index: number): string => {
    const change = versionChange(versions, index);
    if (change.kind === "created") return t.history.created;
    if (change.kind === "restored") return t.history.restoredVersion;
    return t.history.changed(listNames(change.fields.map((f) => t.history[`f_${f}`]), lang));
  };

  const restore = async (version: ExpenseVersion) => {
    if (!latest) return;
    await record({ type: "ExpenseEdited", expenseId: expense.id, baseOpId: latest.opId, expense: version.snapshot });
    onRestored();
  };

  // The prototype's version line (`.ver`): who and what, then when and how much; "Versione attuale" at the end of the
  // current one. "Ripristina questa versione" is too long to share the line on a phone, so it sits under the text.
  return (
    <section className="grid" aria-labelledby="versions-title">
      <h2 id="versions-title" className="display mt-2 mb-0.5 text-[calc(20px*var(--d-scale))]">
        {t.history.edits}
      </h2>
      <ol data-testid="versions">
        {versions
          .map((version, index) => ({ version, index }))
          .reverse()
          .map(({ version, index }) => {
            const current = version.opId === latest?.opId;
            const restorable = !current && !readOnly && !expense.deleted;
            return (
              <li key={version.opId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 [&+&]:border-t-[1.5px] [&+&]:border-line" data-testid="version">
                <div className="grid gap-1">
                  <p className="text-sm">
                    <b className="text-base">{nameOf(version.by)}</b> {what(index)}
                  </p>
                  <p className="num text-[13.5px] text-ink-2">
                    {instantTime(version.at, lang)}: {money(version.snapshot.amount)}
                  </p>
                </div>
                {current ? <span className="text-[13px] text-ink-2">{t.history.current}</span> : null}
                {restorable ? (
                  <Button size="sm" variant="ghost" className="col-span-2 justify-self-start" onClick={() => void restore(version)}>
                    <ArrowUUpLeft size={18} weight="bold" aria-hidden="true" />
                    {t.history.restoreVersion}
                  </Button>
                ) : null}
              </li>
            );
          })}
      </ol>
    </section>
  );
};

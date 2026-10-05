import { ArrowUUpLeft } from "@phosphor-icons/react";
import { Avatar, Button } from "../../components";
import { useDevice } from "../../device";
import { instantTime, listNames } from "../../format";
import { changedFields } from "../../history";
import type { ChangedField } from "../../history";
import type { ExpenseRecord, ExpenseVersion } from "../../../domain";
import { avatarIndex, useTrip } from "../../trip";

interface ExpenseVersionsProps {
  expense: ExpenseRecord;
  onRestored: () => void;
}

/** "Modifiche": the versions of one expense, newest first, with what each changed and "Ripristina questa versione" (SPEC.md §3.15, §3.14). */
export const ExpenseVersions = ({ expense, onRestored }: ExpenseVersionsProps) => {
  const { t, lang } = useDevice();
  const { trip, money, nameOf, record, readOnly } = useTrip();
  const { versions } = expense;
  const latest = versions.at(-1);

  const what = (version: ExpenseVersion, index: number): string => {
    const previous = versions[index - 1];
    if (!previous) return t.history.created;
    // Same content as a version before the one it replaced: someone put an older one back.
    if (versions.slice(0, index - 1).some((v) => JSON.stringify(v.snapshot) === JSON.stringify(version.snapshot))) return t.history.restoredVersion;
    const fields: ChangedField[] = changedFields(previous.snapshot, version.snapshot);
    return t.history.changed(listNames(fields.map((f) => t.history[`f_${f}`]), lang));
  };

  const restore = async (version: ExpenseVersion) => {
    if (!latest) return;
    await record({ type: "ExpenseEdited", expenseId: expense.id, baseOpId: latest.opId, expense: version.snapshot });
    onRestored();
  };

  return (
    <section className="grid gap-1" aria-labelledby="versions-title">
      <h2 id="versions-title" className="display text-[calc(20px*var(--d-scale))]">
        {t.history.edits}
      </h2>
      <ol data-testid="versions">
        {versions
          .map((version, index) => ({ version, index }))
          .reverse()
          .map(({ version, index }) => {
            const current = version.opId === latest?.opId;
            return (
              <li key={version.opId} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 [&+&]:border-t-[1.5px] [&+&]:border-line" data-testid="version">
                <Avatar name={nameOf(version.by)} index={avatarIndex(trip, version.by)} size="sm" />
                <div className="min-w-0">
                  <p>
                    <b>{nameOf(version.by)}</b> {what(version, index)}
                  </p>
                  <p className="num text-[13px] text-ink-2">
                    {instantTime(version.at, lang)}: {money(version.snapshot.amount)}
                  </p>
                </div>
                {current ? (
                  <span className="text-[13px] text-ink-2">{t.history.current}</span>
                ) : readOnly || expense.deleted ? null : (
                  <Button size="sm" variant="ghost" onClick={() => void restore(version)}>
                    <ArrowUUpLeft size={18} weight="bold" aria-hidden="true" />
                    {t.history.restoreVersion}
                  </Button>
                )}
              </li>
            );
          })}
      </ol>
    </section>
  );
};

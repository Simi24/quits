import { DownloadSimple } from "@phosphor-icons/react";
import { Button } from "../../components";
import { useDevice } from "../../device";
import { buildBackup, buildExpensesCsv, downloadText, fileSlug } from "../../export";
import { useTrip } from "../../trip";
import { Setting } from "./Setting";

interface ExportSectionProps {
  notify: (text: string) => void;
}

/** "CSV delle spese" and "Backup JSON delle operazioni" (SPEC.md §7.6 item 12, §10.2). */
export const ExportSection = ({ notify }: ExportSectionProps) => {
  const { t, lang } = useDevice();
  const { tripId, trip, operations } = useTrip();
  const slug = fileSlug(trip.name);

  const csv = () => {
    downloadText(`${slug}-spese.csv`, "text/csv", buildExpensesCsv(trip, lang), true);
    notify(t.manage.exportDone);
  };
  const json = () => {
    downloadText(`${slug}-backup.json`, "application/json", buildBackup({ tripId, operations, exportedAt: new Date().toISOString() }));
    notify(t.manage.exportDone);
  };

  return (
    <Setting title={t.manage.exportL}>
      <div className="flex flex-wrap gap-2.5">
        <Button size="sm" variant="ghost" onClick={csv}>
          <DownloadSimple size={18} weight="bold" aria-hidden="true" />
          {t.manage.exportCsv}
        </Button>
        <Button size="sm" variant="ghost" onClick={json}>
          <DownloadSimple size={18} weight="bold" aria-hidden="true" />
          {t.manage.exportJson}
        </Button>
      </div>
    </Setting>
  );
};

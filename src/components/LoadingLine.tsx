import { useDevice } from "../device";

/** The one line shown while something loads: a trip from IndexedDB, a link being opened, a log on its way. */
export const LoadingLine = () => {
  const { t } = useDevice();
  return (
    <p role="status" className="px-4 py-10 text-ink-2">
      {t.shell.loading}
    </p>
  );
};

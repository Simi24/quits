import { Button } from "../../components";
import { useDevice } from "../../device";
import { TripProvider } from "../../trip";
import { TripShell } from "./TripShell";

interface TripScreenProps {
  tripId: string;
  onLeave: () => void;
}

/** Loads the trip from IndexedDB, then shows it. */
export const TripScreen = ({ tripId, onLeave }: TripScreenProps) => {
  const { t } = useDevice();
  return (
    <TripProvider
      tripId={tripId}
      fallback={(state) =>
        state === "loading" ? (
          <p role="status" className="px-4 py-10 text-ink-2">
            {t.shell.loading}
          </p>
        ) : (
          <div className="grid gap-4 px-4 py-10">
            <p>{t.shell.tripMissing}</p>
            <Button variant="ghost" onClick={onLeave}>
              {t.shell.backHome}
            </Button>
          </div>
        )
      }
    >
      <TripShell onLeave={onLeave} />
    </TripProvider>
  );
};

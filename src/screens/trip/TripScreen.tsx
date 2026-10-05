import { Button, LoadingLine } from "../../components";
import { useDevice } from "../../device";
import { TripProvider } from "../../trip";
import { TripGate } from "./TripGate";

interface TripScreenProps {
  tripId: string;
  onLeave: () => void;
}

/** Loads the trip from IndexedDB, then shows it. */
export const TripScreen = ({ tripId, onLeave }: TripScreenProps) => {
  const { t } = useDevice();
  return (
    <TripProvider
      key={tripId}
      tripId={tripId}
      fallback={(state) =>
        state === "loading" ? (
          <LoadingLine />
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
      <TripGate onLeave={onLeave} />
    </TripProvider>
  );
};

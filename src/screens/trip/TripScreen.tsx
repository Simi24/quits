import { useState } from "react";
import { Button } from "../../components";
import { useDevice } from "../../device";
import { TripProvider, useTrip } from "../../trip";
import { LinkChanged, TripDeleted, TripGone } from "../link";
import { WhoAreYou } from "../who";
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
      key={tripId}
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
      <TripGate onLeave={onLeave} />
    </TripProvider>
  );
};

/** What the server said about the link and the trip decides what shows; then "chi sei?" once per trip (SPEC.md §4). */
const TripGate = ({ onLeave }: { onLeave: () => void }) => {
  const { t } = useDevice();
  const { access, deletion, trip, nameOf, sync, restoreTrip, identified } = useTrip();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (access === "link_changed") return <LinkChanged onBack={onLeave} />;
  if (access === "unavailable") return <TripGone onBack={onLeave} />;
  if (access === "deleted" && deletion) {
    const known = trip.roster.some((r) => r.id === deletion.deletedBy);
    const restore = async () => {
      setBusy(true);
      setFailed(false);
      const result = await restoreTrip();
      setBusy(false);
      setFailed(result.status !== "ok");
    };
    return (
      <TripDeleted
        deletion={deletion}
        deletedByName={known ? nameOf(deletion.deletedBy) : null}
        hasQueue={sync.pending > 0}
        busy={busy}
        failed={failed}
        onRestore={() => void restore()}
        onBack={onLeave}
      />
    );
  }
  // A trip opened from a link whose log has not arrived yet.
  if (trip.participants.length === 0 && sync.status !== "local") {
    return (
      <p role="status" className="px-4 py-10 text-ink-2">
        {t.shell.loading}
      </p>
    );
  }
  if (!identified) return <WhoAreYou onDone={() => undefined} />;
  return <TripShell onLeave={onLeave} />;
};

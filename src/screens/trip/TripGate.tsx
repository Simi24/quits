import { useState } from "react";
import { LoadingLine } from "../../components";
import { useTrip } from "../../trip";
import { LinkChanged, TripDeleted, TripGone } from "../link";
import { WhoAreYou } from "../who";
import { TripShell } from "./TripShell";

interface TripGateProps {
  onLeave: () => void;
}

/** What the server said about the link and the trip decides what shows; then "chi sei?" once per trip (SPEC.md §4). */
export const TripGate = ({ onLeave }: TripGateProps) => {
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
  if (trip.participants.length === 0 && sync.status !== "local") return <LoadingLine />;
  if (!identified) return <WhoAreYou onDone={() => undefined} />;
  return <TripShell onLeave={onLeave} />;
};

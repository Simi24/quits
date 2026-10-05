import { useCallback, useState } from "react";
import { listTrips, updateDevice } from "../db";
import type { TripSummary } from "../db";
import { CreateTrip } from "./create";
import { Landing } from "./landing";
import { TripScreen } from "./trip";

type Screen = { name: "landing" } | { name: "create" } | { name: "trip"; tripId: string };

interface AppScreensProps {
  initialTrips: TripSummary[];
  /** The trip the app was left on: reloading comes back to it (SPEC.md §5.5). */
  lastTripId: string | null;
}

/** Which screen is showing. There is no router yet: the trip link and its fragment arrive with S4. */
export const AppScreens = ({ initialTrips, lastTripId }: AppScreensProps) => {
  const [trips, setTrips] = useState(initialTrips);
  const [screen, setScreen] = useState<Screen>(
    lastTripId && initialTrips.some((t) => t.tripId === lastTripId) ? { name: "trip", tripId: lastTripId } : { name: "landing" },
  );

  const goLanding = useCallback(async () => {
    await updateDevice({ lastTripId: null });
    setTrips(await listTrips());
    setScreen({ name: "landing" });
  }, []);

  if (screen.name === "create") {
    return <CreateTrip onBack={() => setScreen({ name: "landing" })} onCreated={(tripId) => setScreen({ name: "trip", tripId })} />;
  }
  if (screen.name === "trip") return <TripScreen tripId={screen.tripId} onLeave={() => void goLanding()} />;
  return <Landing trips={trips} onOpen={(tripId) => setScreen({ name: "trip", tripId })} onCreate={() => setScreen({ name: "create" })} />;
};

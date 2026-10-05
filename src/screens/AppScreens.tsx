import { useCallback, useEffect, useState } from "react";
import { LoadingLine } from "../components";
import type { BootOpen } from "../boot";
import { listTrips, updateDevice } from "../db";
import type { TripSummary } from "../db";
import { useDevice } from "../device";
import { requestPersist } from "../pwa";
import { openLink, restoreTrip } from "../sync";
import { api, store } from "../sync/client";
import { buildOperation } from "../trip";
import { CreateTrip } from "./create";
import { Landing } from "./landing";
import { ProblemScreen } from "./link";
import type { LinkProblem } from "./link";
import { ReadyScreen } from "./ready";
import { TripScreen } from "./trip";

type Screen =
  | { name: "landing" }
  | { name: "create" }
  | { name: "ready"; token: string; tripId: string }
  | { name: "trip"; tripId: string }
  | { name: "opening" }
  | { name: "problem"; problem: LinkProblem; token: string };

interface AppScreensProps {
  initialTrips: TripSummary[];
  /** What the start decided to open: the link, the trip the app was left on, or the landing (SPEC.md §5.5). */
  start: BootOpen;
}

/** The trip link is `/v/#<token>`; the fragment never reaches the server (SPEC.md §4). */
const linkToken = (): string => (window.location.pathname.startsWith("/v") ? window.location.hash.slice(1) : "");

const leaveLink = () => window.history.replaceState(null, "", "/");

/** Which screen is showing, and what a link in the address bar does. */
export const AppScreens = ({ initialTrips, start }: AppScreensProps) => {
  const { deviceId } = useDevice();
  const [trips, setTrips] = useState(initialTrips);
  const [screen, setScreen] = useState<Screen>(() =>
    start.kind === "link" ? { name: "opening" } : start.kind === "trip" ? { name: "trip", tripId: start.tripId } : { name: "landing" },
  );

  const goLanding = useCallback(async () => {
    leaveLink();
    await updateDevice({ lastTripId: null });
    setTrips(await listTrips());
    setScreen({ name: "landing" });
  }, []);

  const openToken = useCallback(async (token: string) => {
    setScreen({ name: "opening" });
    const outcome = await openLink({ token, store, api });
    const problem = (problem: LinkProblem) => setScreen({ name: "problem", problem, token });
    switch (outcome.status) {
      case "opened":
        if (outcome.isNew) requestPersist();
        setScreen({ name: "trip", tripId: outcome.tripId });
        break;
      case "deleted":
        if (await store.hasTrip(outcome.tripId)) setScreen({ name: "trip", tripId: outcome.tripId });
        else problem({ kind: "deleted", deletion: outcome.deletion });
        break;
      case "link_changed":
        problem({ kind: "link_changed" });
        break;
      case "unavailable":
        problem({ kind: "gone" });
        break;
      default:
        problem({ kind: "trouble", trouble: outcome.status });
    }
  }, []);

  useEffect(() => {
    const token = linkToken();
    if (token) void openToken(token);
    const onHash = () => {
      const next = linkToken();
      if (next) void openToken(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [openToken]);

  /** "Ripristina" from the landing list: the trip is on this device, so its queue goes out afterwards. */
  const restoreFromLanding = useCallback(
    async (tripId: string): Promise<boolean> => {
      const summary = trips.find((s) => s.tripId === tripId);
      const { token, deletion, meId } = summary?.meta ?? {};
      const by = meId ?? deletion?.deletedBy;
      if (!token || !by) return false;
      const result = await restoreTrip({ api, store }, tripId, token, buildOperation({ by, device: deviceId }, { type: "TripRestored" }));
      setTrips(await listTrips());
      return result.status === "ok";
    },
    [trips, deviceId],
  );

  switch (screen.name) {
    case "create":
      return <CreateTrip onBack={() => setScreen({ name: "landing" })} onCreated={(tripId, token) => {
        requestPersist();
        setScreen({ name: "ready", tripId, token });
      }} />;
    case "ready":
      return <ReadyScreen token={screen.token} onOpen={() => setScreen({ name: "trip", tripId: screen.tripId })} />;
    case "trip":
      return <TripScreen tripId={screen.tripId} onLeave={() => void goLanding()} />;
    case "opening":
      return <LoadingLine />;
    case "problem":
      return <ProblemScreen problem={screen.problem} token={screen.token} onRetry={openToken} onBack={() => void goLanding()} />;
    default:
      return (
        <Landing
          trips={trips}
          onOpen={(tripId) => setScreen({ name: "trip", tripId })}
          onCreate={() => setScreen({ name: "create" })}
          onOpenToken={(token) => void openToken(token)}
          onRestore={restoreFromLanding}
        />
      );
  }
};

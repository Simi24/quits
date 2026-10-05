import { useCallback, useEffect, useState } from "react";
import { listTrips, updateDevice } from "../db";
import type { TripSummary } from "../db";
import { useDevice } from "../device";
import { openLink, restoreTrip } from "../sync";
import type { Deletion } from "../sync";
import { api, store } from "../sync/client";
import { buildOperation } from "../trip";
import { CreateTrip } from "./create";
import { Landing } from "./landing";
import { LinkChanged, LinkTrouble, TripDeleted, TripGone } from "./link";
import { ReadyScreen } from "./ready";
import { TripScreen } from "./trip";

/** A link that did not lead into a live trip. */
type Problem =
  | { kind: "link_changed" }
  | { kind: "gone" }
  | { kind: "trouble"; trouble: "offline" | "error" }
  | { kind: "deleted"; token: string; deletion: Deletion };

type Screen =
  | { name: "landing" }
  | { name: "create" }
  | { name: "ready"; token: string; tripId: string }
  | { name: "trip"; tripId: string }
  | { name: "opening" }
  | { name: "problem"; problem: Problem; token: string };

interface AppScreensProps {
  initialTrips: TripSummary[];
  /** The trip the app was left on: reloading comes back to it (SPEC.md §5.5). */
  lastTripId: string | null;
}

/** The trip link is `/v/#<token>`; the fragment never reaches the server (SPEC.md §4). */
const linkToken = (): string => (window.location.pathname.startsWith("/v") ? window.location.hash.slice(1) : "");

const leaveLink = () => window.history.replaceState(null, "", "/");

/** Which screen is showing, and what a link in the address bar does. */
export const AppScreens = ({ initialTrips, lastTripId }: AppScreensProps) => {
  const { deviceId } = useDevice();
  const [trips, setTrips] = useState(initialTrips);
  const [screen, setScreen] = useState<Screen>(() => {
    if (linkToken()) return { name: "opening" };
    return lastTripId && initialTrips.some((t) => t.tripId === lastTripId) ? { name: "trip", tripId: lastTripId } : { name: "landing" };
  });

  const goLanding = useCallback(async () => {
    leaveLink();
    await updateDevice({ lastTripId: null });
    setTrips(await listTrips());
    setScreen({ name: "landing" });
  }, []);

  const openToken = useCallback(async (token: string) => {
    setScreen({ name: "opening" });
    const outcome = await openLink({ token, store, api });
    const problem = (problem: Problem) => setScreen({ name: "problem", problem, token });
    switch (outcome.status) {
      case "opened":
        // Best effort, never relied on (SPEC.md §5.2).
        if (outcome.isNew) void navigator.storage?.persist?.();
        setScreen({ name: "trip", tripId: outcome.tripId });
        break;
      case "deleted":
        if (await store.hasTrip(outcome.tripId)) setScreen({ name: "trip", tripId: outcome.tripId });
        else problem({ kind: "deleted", token, deletion: outcome.deletion });
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
      return <CreateTrip onBack={() => setScreen({ name: "landing" })} onCreated={(tripId, token) => setScreen({ name: "ready", tripId, token })} />;
    case "ready":
      return <ReadyScreen token={screen.token} onOpen={() => setScreen({ name: "trip", tripId: screen.tripId })} />;
    case "trip":
      return <TripScreen tripId={screen.tripId} onLeave={() => void goLanding()} />;
    case "opening":
      return <OpeningLink />;
    case "problem":
      return <ProblemScreen problem={screen.problem} token={screen.token} onRetry={openToken} onBack={() => void goLanding()} />;
    default:
      return (
        <Landing trips={trips} onOpen={(tripId) => setScreen({ name: "trip", tripId })} onCreate={() => setScreen({ name: "create" })} onRestore={restoreFromLanding} />
      );
  }
};

const OpeningLink = () => {
  const { t } = useDevice();
  return (
    <p role="status" className="px-4 py-10 text-ink-2">
      {t.shell.loading}
    </p>
  );
};

interface ProblemScreenProps {
  problem: Problem;
  token: string;
  onRetry: (token: string) => Promise<void>;
  onBack: () => void;
}

const ProblemScreen = ({ problem, token, onRetry, onBack }: ProblemScreenProps) => {
  const { deviceId } = useDevice();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (problem.kind === "link_changed") return <LinkChanged onBack={onBack} />;
  if (problem.kind === "gone") return <TripGone onBack={onBack} />;
  if (problem.kind === "trouble") return <LinkTrouble kind={problem.trouble} onRetry={() => void onRetry(token)} onBack={onBack} />;

  // Anyone with the link can restore; this device does not know the trip's people, so the delete's author stands in as `by`.
  const restore = async () => {
    setBusy(true);
    setFailed(false);
    const operation = buildOperation({ by: problem.deletion.deletedBy, device: deviceId }, { type: "TripRestored" });
    const result = await restoreTrip({ api, store }, null, token, operation);
    setBusy(false);
    if (result.status === "ok") await onRetry(token);
    else setFailed(true);
  };
  return <TripDeleted deletion={problem.deletion} deletedByName={null} hasQueue={false} busy={busy} failed={failed} onRestore={() => void restore()} onBack={onBack} />;
};

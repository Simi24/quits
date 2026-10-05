import { useState } from "react";
import { useDevice } from "../../device";
import { restoreTrip } from "../../sync";
import type { Deletion } from "../../sync";
import { api, store } from "../../sync/client";
import { buildOperation } from "../../trip";
import { LinkChanged } from "./LinkChanged";
import { LinkTrouble } from "./LinkTrouble";
import { TripDeleted } from "./TripDeleted";
import { TripGone } from "./TripGone";

/** A link that did not lead into a live trip. */
export type LinkProblem =
  | { kind: "link_changed" }
  | { kind: "gone" }
  | { kind: "trouble"; trouble: "offline" | "error" }
  | { kind: "deleted"; deletion: Deletion };

interface ProblemScreenProps {
  problem: LinkProblem;
  token: string;
  onRetry: (token: string) => Promise<void>;
  onBack: () => void;
}

/** What a link that did not open shows, for a trip this device does not have (SPEC.md §6.4). */
export const ProblemScreen = ({ problem, token, onRetry, onBack }: ProblemScreenProps) => {
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

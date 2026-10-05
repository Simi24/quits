import { useState } from "react";
import { useLandingBeacon } from "../../analytics";
import { EqualMark, FooterLinks, Segmented, ThemeButton } from "../../components";
import { useDevice } from "../../device";
import type { TripSummary } from "../../db";
import { CreatorCode } from "./CreatorCode";
import { DeletedTicket } from "./DeletedTicket";
import { HowItWorks } from "./HowItWorks";
import { OpenLinkField } from "./OpenLinkField";
import { TripTicket } from "./TripTicket";

interface LandingProps {
  trips: TripSummary[];
  onOpen: (tripId: string) => void;
  onCreate: () => void;
  onOpenToken: (token: string) => void;
  onRestore: (tripId: string) => Promise<boolean>;
}

/** The public landing: wordmark, the trips already opened on this device, creation (SPEC.md §7.6 item 1). */
export const Landing = ({ trips, onOpen, onCreate, onOpenToken, onRestore }: LandingProps) => {
  const { t, lang, setLang } = useDevice();
  useLandingBeacon();
  const [restoring, setRestoring] = useState<{ tripId: string; failed: boolean } | null>(null);
  const live = trips.filter((s) => s.meta.access !== "deleted" && s.meta.access !== "unavailable");
  const now = Date.now();
  const deleted = trips.filter((s) => s.meta.access === "deleted" && s.meta.deletion && Date.parse(s.meta.deletion.restoreUntil) > now);
  const ordered = [...live].sort((a, b) => Number(a.trip.status === "closed") - Number(b.trip.status === "closed"));

  const restore = async (tripId: string) => {
    setRestoring({ tripId, failed: false });
    const ok = await onRestore(tripId);
    setRestoring(ok ? null : { tripId, failed: true });
  };
  return (
    <main className="h-full overflow-y-auto">
      <section className="relative grid gap-[18px] px-5 pt-6 pb-[26px]">
        <div className="absolute top-2 right-4 flex items-center gap-1.5">
          <div className="w-[97px]">
            <Segmented
              compact
              label={t.settings.lang}
              value={lang}
              onChange={setLang}
              options={[
                { value: "it", label: "IT" },
                { value: "en", label: "EN" },
              ]}
            />
          </div>
          <ThemeButton />
        </div>
        <div className="flex items-center gap-4">
          <EqualMark />
          <h1 className="display text-[calc(76px*var(--d-scale))] leading-[.9]">quits</h1>
        </div>
        <p className="max-w-[30ch] text-[19px] leading-[1.35]">{t.shell.tagline}</p>
      </section>
      <section className="grid gap-3.5 px-4 pt-1 pb-7">
        <h2 className="display text-[calc(20px*var(--d-scale))]">{t.shell.yourTrips}</h2>
        {ordered.length === 0 ? (
          <p className="text-[13.5px] text-ink-2">{t.shell.noTrips}</p>
        ) : (
          <div className="grid gap-2.5">
            {ordered.map((summary) => (
              <TripTicket key={summary.tripId} summary={summary} onOpen={() => onOpen(summary.tripId)} />
            ))}
          </div>
        )}
        <p className="text-[13.5px] text-ink-2">{t.shell.needLink}</p>
      </section>
      <HowItWorks />
      {deleted.length ? (
        <section className="grid gap-3.5 px-4 pb-7">
          <h2 className="display text-[calc(20px*var(--d-scale))]">{t.sync.deletedTrips}</h2>
          <div className="grid gap-2.5">
            {deleted.map((summary) => (
              <DeletedTicket
                key={summary.tripId}
                summary={summary}
                busy={restoring?.tripId === summary.tripId && !restoring.failed}
                failed={restoring?.tripId === summary.tripId && restoring.failed}
                onRestore={() => void restore(summary.tripId)}
              />
            ))}
          </div>
        </section>
      ) : null}
      <OpenLinkField onOpen={onOpenToken} />
      <CreatorCode onCreate={onCreate} />
      <footer className="border-t-2 border-dashed border-line px-4 py-7">
        <nav aria-label={t.manage.footerLabel} className="flex flex-wrap gap-x-5 gap-y-2 text-[14.5px]">
          <FooterLinks />
        </nav>
      </footer>
    </main>
  );
};

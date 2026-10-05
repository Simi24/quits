import { Plus } from "@phosphor-icons/react";
import { Button, DevicePreferences, EqualMark, Segmented } from "../../components";
import { useDevice } from "../../device";
import type { TripSummary } from "../../db";
import { TripTicket } from "./TripTicket";

interface LandingProps {
  trips: TripSummary[];
  onOpen: (tripId: string) => void;
  onCreate: () => void;
}

/** The public landing: wordmark, the trips already opened on this device, creation (SPEC.md §7.6 item 1). */
export const Landing = ({ trips, onOpen, onCreate }: LandingProps) => {
  const { t, lang, setLang } = useDevice();
  const ordered = [...trips].sort((a, b) => Number(a.trip.status === "closed") - Number(b.trip.status === "closed"));
  return (
    <main className="h-full overflow-y-auto">
      <div className="flex justify-end px-4 pt-3">
        <div className="w-[120px]">
          <Segmented
            label={t.settings.lang}
            value={lang}
            onChange={setLang}
            options={[
              { value: "it", label: "IT" },
              { value: "en", label: "EN" },
            ]}
          />
        </div>
      </div>
      <section className="grid gap-[18px] px-5 pt-6 pb-[26px]">
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
      <section className="grid gap-3.5 border-t-2 border-dashed border-line px-4 py-7">
        <Button wide onClick={onCreate}>
          <Plus size={20} weight="bold" aria-hidden="true" />
          {t.shell.createTrip}
        </Button>
      </section>
      <footer className="border-t-2 border-dashed border-line px-4 py-7">
        <DevicePreferences />
      </footer>
    </main>
  );
};

import { DevicePreferences } from "../../components";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { CategoriesSection } from "./CategoriesSection";
import { CurrencySection } from "./CurrencySection";
import { DefaultSplitSection } from "./DefaultSplitSection";
import { ExportSection } from "./ExportSection";
import { IdentitySection } from "./IdentitySection";
import { ParticipantsSection } from "./ParticipantsSection";
import { Setting } from "./Setting";
import { TripDetailsSection } from "./TripDetailsSection";
import { TripFooter } from "./TripFooter";

interface ViaggioScreenProps {
  onNotMe: () => void;
  notify: (text: string) => void;
}

/** Viaggio: identity, the trip's name and dates, participants, default split, categories, currency, export, this device, the footer (SPEC.md §7.6 item 12). */
export const ViaggioScreen = ({ onNotMe, notify }: ViaggioScreenProps) => {
  const { t } = useDevice();
  const { trip } = useTrip();
  return (
    <div className="px-4 pt-0.5 pb-8">
      <IdentitySection onNotMe={onNotMe} />
      {/* Keyed by what they show, so a change that arrives from elsewhere (a rename, a merge) resets the form. */}
      <TripDetailsSection key={`${trip.name}|${trip.from}|${trip.to}`} onSaved={() => notify(t.manage.tripSaved)} />
      <ParticipantsSection notify={notify} />
      <DefaultSplitSection key={JSON.stringify(trip.defaultSplit)} onSaved={() => notify(t.expenses.savedEdit)} />
      <CategoriesSection notify={notify} />
      <CurrencySection onChanged={() => notify(t.manage.currencyChanged)} />
      <ExportSection notify={notify} />
      <Setting title={t.settings.device}>
        <DevicePreferences />
      </Setting>
      <TripFooter />
    </div>
  );
};

import { DevicePreferences } from "../../components";
import { useDevice } from "../../device";
import { CategoriesSection } from "./CategoriesSection";
import { CurrencySection } from "./CurrencySection";
import { DefaultSplitSection } from "./DefaultSplitSection";
import { IdentitySection } from "./IdentitySection";
import { ParticipantsSection } from "./ParticipantsSection";
import { CloseSection } from "./CloseSection";
import { DeleteSection } from "./DeleteSection";
import { Setting } from "./Setting";
import { TripLinkSection } from "./TripLinkSection";

interface ViaggioScreenProps {
  onNotMe: () => void;
  notify: (text: string) => void;
}

/** Viaggio: identity, participants, default split, categories, currency, this device (SPEC.md §7.6 item 12). */
export const ViaggioScreen = ({ onNotMe, notify }: ViaggioScreenProps) => {
  const { t } = useDevice();
  return (
    <div className="px-4 pt-0.5 pb-8">
      <IdentitySection onNotMe={onNotMe} />
      <TripLinkSection notify={notify} />
      <ParticipantsSection onAdded={() => notify(t.settings.personAdded)} />
      <DefaultSplitSection onSaved={() => notify(t.expenses.savedEdit)} />
      <CategoriesSection notify={notify} />
      <CurrencySection />
      <Setting title={t.settings.device}>
        <DevicePreferences />
      </Setting>
      <CloseSection notify={notify} />
      <DeleteSection />
    </div>
  );
};

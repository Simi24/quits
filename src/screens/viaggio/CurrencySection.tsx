import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { Setting } from "./Setting";

/** The trip currency. Changing it (only while there are no expenses) arrives with S6. */
export const CurrencySection = () => {
  const { t } = useDevice();
  const { trip } = useTrip();
  const hasExpenses = trip.expenses.length > 0;
  return (
    <Setting title={t.settings.currency}>
      <div className="flex items-center gap-2.5">
        <b>{trip.currency}</b>
        <span className="text-[13.5px] text-ink-2">{hasExpenses ? t.settings.currencyLocked : t.create.currencyHelp}</span>
      </div>
    </Setting>
  );
};

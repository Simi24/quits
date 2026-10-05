import { CURRENCIES } from "../../create-trip/currencies";
import { SelectField } from "../../components";
import { canChangeCurrency } from "../../../domain";
import { useDevice } from "../../device";
import { useTrip } from "../../trip";
import { Setting } from "./Setting";

interface CurrencySectionProps {
  onChanged: () => void;
}

/** The trip currency: selectable while the trip has no expenses, otherwise shown disabled with the reason (SPEC.md §3.2). */
export const CurrencySection = ({ onChanged }: CurrencySectionProps) => {
  const { t } = useDevice();
  const { trip, record } = useTrip();
  const open = canChangeCurrency(trip);
  const options = CURRENCIES.includes(trip.currency) ? CURRENCIES : [trip.currency, ...CURRENCIES];
  return (
    <Setting title={t.settings.currency}>
      <SelectField
        id="edit-trip-currency"
        label={t.manage.currencyChange}
        value={trip.currency}
        disabled={!open}
        aria-describedby="currency-help"
        onChange={(event) => {
          void record({ type: "TripCurrencyChanged", currency: event.target.value }).then(onChanged);
        }}
      >
        {options.map((code) => (
          <option key={code}>{code}</option>
        ))}
      </SelectField>
      <p id="currency-help" className="text-[13.5px] text-ink-2">
        {open ? t.create.currencyHelp : t.settings.currencyLocked}
      </p>
    </Setting>
  );
};

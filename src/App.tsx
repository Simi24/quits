import { useEffect, useState } from "react";
import { listTrips, readDevice } from "./db";
import type { DeviceRecord, TripSummary } from "./db";
import { DeviceProvider } from "./device";
import { AppScreens } from "./screens/AppScreens";

interface Boot {
  device: DeviceRecord;
  trips: TripSummary[];
}

/** Reads the device record and the trips on this device from IndexedDB, then hands over to the screens. */
export const App = () => {
  const [boot, setBoot] = useState<Boot | null>(null);

  useEffect(() => {
    void Promise.all([readDevice(), listTrips()]).then(([device, trips]) => setBoot({ device, trips }));
  }, []);

  return (
    <div className="relative mx-auto h-full max-w-[30rem] overflow-hidden border-line bg-paper md:border-x-[1.5px]">
      {boot ? (
        <DeviceProvider device={boot.device}>
          <AppScreens initialTrips={boot.trips} lastTripId={boot.device.lastTripId} />
        </DeviceProvider>
      ) : null}
    </div>
  );
};

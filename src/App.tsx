import { useEffect, useState } from "react";
import { bootApp, mirrorBridge } from "./boot";
import type { Booted } from "./boot";
import { UpdateBanner } from "./components";
import { DeviceProvider } from "./device";
import { AppScreens } from "./screens/AppScreens";
import { isPrivacyPath, PrivacyScreen } from "./screens/privacy";

/** Boots from the link, IndexedDB or the cookie bridge (SPEC.md §5.5), then hands over to the screens. */
export const App = () => {
  const [boot, setBoot] = useState<Booted | null>(null);

  useEffect(() => {
    void bootApp().then(setBoot);
  }, []);
  useEffect(() => (boot ? mirrorBridge() : undefined), [boot]);

  return (
    <div className="app-col relative mx-auto h-full max-w-[30rem] overflow-hidden border-line bg-paper md:border-x-[1.5px]">
      {boot ? (
        <DeviceProvider device={boot.device}>
          {isPrivacyPath(window.location.pathname) ? (
            <PrivacyScreen />
          ) : (
            <AppScreens initialTrips={boot.trips} start={boot.open} />
          )}
          <UpdateBanner />
        </DeviceProvider>
      ) : null}
    </div>
  );
};

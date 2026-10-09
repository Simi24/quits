import type { ReactNode } from "react";
import { useTrip } from "../../trip";

interface SettingProps {
  title: string;
  children: ReactNode;
  /** Its controls change the trip: they are off while the trip is closed (SPEC.md §3.2). */
  edits?: boolean;
  /** The anchor other screens link to. */
  id?: string;
}

/** One group of Viaggio: a heading and its controls, divided from the next by a rule. */
export const Setting = ({ title, children, edits = false, id }: SettingProps) => {
  const { readOnly } = useTrip();
  return (
    <section id={id} className="grid gap-2.5 scroll-mt-2 py-[18px] [&+&]:border-t-[1.5px] [&+&]:border-line">
      <h2 className="text-[17px] font-bold">{title}</h2>
      {edits ? (
        <fieldset disabled={readOnly} className="contents">
          {children}
        </fieldset>
      ) : (
        children
      )}
    </section>
  );
};

import type { ReactNode } from "react";

interface SettingProps {
  title: string;
  children: ReactNode;
}

/** One group of Viaggio: a heading and its controls, divided from the next by a rule. */
export const Setting = ({ title, children }: SettingProps) => (
  <section className="grid gap-2.5 py-[18px] [&+&]:border-t-[1.5px] [&+&]:border-line">
    <h2 className="text-[17px] font-bold">{title}</h2>
    {children}
  </section>
);

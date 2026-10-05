import type { ReactNode } from "react";

export const sectionClass = "grid gap-2.5 border-t-2 border-dashed border-line pt-6";
export const headingClass = "display text-[calc(20px*var(--d-scale))]";

interface SectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

/** One headed block of the privacy page, set off by the dashed rule the landing uses. */
export const Section = ({ id, title, children }: SectionProps) => (
  <section aria-labelledby={`privacy-${id}`} className={`${sectionClass} text-[15px]`}>
    <h2 id={`privacy-${id}`} className={headingClass}>
      {title}
    </h2>
    {children}
  </section>
);

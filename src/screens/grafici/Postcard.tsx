import { CaretRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useDevice } from "../../device";

interface PostcardProps {
  title: string;
  teaser: string;
  stamp: ReactNode;
  onOpen: () => void;
}

/** What is one tap away: a true sentence and a stamp that previews the chart (SPEC.md §8.1). */
export const Postcard = ({ title, teaser, stamp, onOpen }: PostcardProps) => {
  const { t } = useDevice();
  return (
    <button type="button" className="postcard" onClick={onOpen} data-testid="postcard">
      <span className="min-w-0">
        <h3 className="display text-[calc(19px*var(--d-scale))]">{title}</h3>
        <p className="mt-1.5 pr-[18px] text-sm text-ink-2">{teaser}</p>
        <span className="mt-2.5 inline-flex items-center gap-1 text-sm font-bold">
          {t.charts.open}
          <CaretRight size={16} weight="bold" aria-hidden="true" />
        </span>
      </span>
      <span className="stamp-mini" aria-hidden="true">
        {stamp}
      </span>
    </button>
  );
};

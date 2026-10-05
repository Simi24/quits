export interface ReadoutRowData {
  /** A CSS colour, usually a token: `var(--pool)`. */
  color: string;
  label: string;
  value?: string;
}

/** What the row under a chart says about the selected mark: the prototype's tip, without the floating (SPEC.md §8.4). */
export interface ReadoutData {
  title: string;
  value?: string;
  rows?: ReadoutRowData[];
  notes?: string[];
}

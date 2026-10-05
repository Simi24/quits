export interface DayAxisColumn {
  /** Weekday, or "Prima" for the bookings bucket. */
  top: string;
  /** Day of the month. */
  bottom: string;
  /** After today: shaded as future. */
  dim: boolean;
  today: boolean;
}

interface DayAxisProps {
  columns: DayAxisColumn[];
  x: (index: number) => number;
  y: number;
  band: number;
}

/** Weekday over day number, thinned out when the days are narrower than their labels. */
export const DayAxis = ({ columns, x, y, band }: DayAxisProps) => {
  const every = Math.max(1, Math.ceil(30 / band));
  return (
    <>
      {columns.map((c, i) =>
        i % every === 0 || c.today ? (
          <g key={i}>
            <text x={x(i)} y={y} textAnchor="middle" className={c.dim ? "dim" : ""}>
              {c.top}
            </text>
            <text x={x(i)} y={y + 14} textAnchor="middle" className={c.today ? "today" : c.dim ? "dim" : ""}>
              {c.bottom}
            </text>
          </g>
        ) : null,
      )}
    </>
  );
};

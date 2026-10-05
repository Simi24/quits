interface NumbersTableProps {
  head: string[];
  rows: string[][];
  /** Rows that are estimates, shown in italics. */
  estimateRows?: number[];
}

/** The "Numeri" twin of a chart: the same figures as a table (SPEC.md §8.1). */
export const NumbersTable = ({ head, rows, estimateRows = [] }: NumbersTableProps) => (
  <table className="nt" data-testid="numbers">
    <thead>
      <tr>
        {head.map((h, i) => (
          <th key={h} scope="col" className={i ? "r" : ""}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, k) => (
        <tr key={row[0]! + k} className={estimateRows.includes(k) ? "est" : ""}>
          {row.map((cell, i) =>
            i === 0 ? (
              <th key={i} scope="row" className="rowhead">
                {cell}
              </th>
            ) : (
              <td key={i} className="r num">
                {cell}
              </td>
            ),
          )}
        </tr>
      ))}
    </tbody>
  </table>
);

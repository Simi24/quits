import type { ChartModel } from "../../../domain";

/** The heat table in miniature, for the postcard. */
export const MatrixStamp = ({ model }: { model: ChartModel }) => {
  const m = model.matrix;
  const cw = 66 / Math.max(1, m.participantIds.length);
  const ch = 82 / Math.max(1, m.categoryIds.length);
  return (
    <svg viewBox="0 0 66 82" aria-hidden="true">
      {m.categoryIds.map((c, r) =>
        m.participantIds.map((id, k) => (
          <rect
            key={`${c}${id}`}
            x={k * cw + 0.8}
            y={r * ch + 0.8}
            width={cw - 1.6}
            height={ch - 1.6}
            rx={1.5}
            style={{ fill: `color-mix(in srgb, var(--lead) ${(8 + (84 * Math.max(0, m.cells[c]![id]!)) / m.max).toFixed(0)}%, var(--receipt))` }}
          />
        )),
      )}
    </svg>
  );
};

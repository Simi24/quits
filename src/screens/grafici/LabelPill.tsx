interface LabelPillProps {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
}

/** A value written on the chart over a paper-coloured pill, so it stays readable over lines. */
export const LabelPill = ({ x, y, text, anchor = "end" }: LabelPillProps) => {
  const w = text.length * 6.6 + 10;
  const x0 = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
  return (
    <g>
      <rect className="lbl-bg" x={x0} y={y - 12} width={w} height={17} rx={8.5} />
      <text className="strong" x={x0 + w / 2} y={y + 0.5} textAnchor="middle">
        {text}
      </text>
    </g>
  );
};

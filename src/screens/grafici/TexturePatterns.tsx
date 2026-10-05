/** The SVG patterns the charts fill with (the prototype's `tx-*`). Rendered once; the colour is the `--tx` token. */
export const TexturePatterns = () => (
  <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
    <defs>
      <pattern id="tx-a" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="1.6" height="6" style={{ fill: "var(--tx)" }} />
      </pattern>
      <pattern id="tx-b" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
        <rect width="1.6" height="6" style={{ fill: "var(--tx)" }} />
      </pattern>
      <pattern id="tx-c" width="3.6" height="3.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="1.4" height="3.6" style={{ fill: "var(--tx)" }} />
      </pattern>
      <pattern id="tx-e" width="3.6" height="3.6" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
        <rect width="1.4" height="3.6" style={{ fill: "var(--tx)" }} />
      </pattern>
      <pattern id="tx-d" width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="2.5" cy="2.5" r="1.2" style={{ fill: "var(--tx)" }} />
      </pattern>
      <pattern id="tx-x" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="1.3" height="6" style={{ fill: "var(--tx)" }} />
        <rect width="6" height="1.3" style={{ fill: "var(--tx)" }} />
      </pattern>
    </defs>
  </svg>
);

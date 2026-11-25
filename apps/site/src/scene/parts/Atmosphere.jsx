// The front layer: lamp glows, a haze band and dust drifting in the light.
// All cheap: radial gradients and small circles, no filters.

export function LampGlow({ x, y, reach = 300, delay = 0 }) {
  return (
    <g className="lamp-flicker" style={{ animationDelay: `${delay}s` }}>
      <ellipse cx={x} cy={y + 20 + reach} rx={reach * 0.9} ry={reach} fill="url(#g-lamp-glow)" />
      <circle cx={x} cy={y + 26} r={46} fill="url(#g-point-glow)" />
    </g>
  );
}

export function Haze({ x, y, w, h }) {
  return <rect x={x} y={y} width={w} height={h} fill="url(#g-haze)" />;
}

// Dust specks drift slowly in the lamp light.
export function Dust({ x, y, count = 14, spread = 360 }) {
  const specks = Array.from({ length: count }, (_, i) => {
    const a = (i * 137.5 * Math.PI) / 180; // golden-angle scatter
    const r = spread * Math.sqrt((i + 0.5) / count);
    return { cx: x + Math.cos(a) * r, cy: y + Math.sin(a) * r * 0.6, d: (i % 5) * 1.3 };
  });
  return (
    <g>
      {specks.map((s, i) => (
        <circle key={i} className="dust" style={{ animationDelay: `${s.d}s` }} cx={s.cx} cy={s.cy} r={i % 3 ? 1.8 : 2.8} fill="#FFE2A8" opacity="0.7" />
      ))}
    </g>
  );
}

import { C, LINE, inked } from '../palette.js';

const chain = (x, y0, y1) => (
  <path d={`M${x},${y0} V${y1}`} stroke={C.girder} strokeWidth={4} strokeDasharray="7 5" />
);

// ── Orange dot-matrix train indicator. Real text, shown through a dot mask
// (the dots stay still while the text scrolls under them, like the real
// boards). `lines`: [{ text, scroll? }], top to bottom.
export function LedBoard({ x, y, w, h, chainTop, lines }) {
  const pad = 14;
  const fx = x + pad;
  const fw = w - pad * 2;
  const rowH = (h - pad * 2) / lines.length;
  const clipId = `clip-led-${Math.round(x)}-${Math.round(y)}`;
  return (
    <g aria-hidden="true">
      {chain(x + 40, chainTop, y)}
      {chain(x + w - 40, chainTop, y)}
      <rect x={x} y={y} width={w} height={h} rx={12} fill={C.ledCase} {...inked(LINE.near)} />
      <clipPath id={clipId}>
        <rect x={fx} y={y + pad} width={fw} height={h - pad * 2} rx={4} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {/* Unlit dots */}
        <rect x={fx} y={y + pad} width={fw} height={h - pad * 2} fill={C.ledOff} mask="url(#m-led-dots)" />
        {lines.map((line, i) => {
          const ty = y + pad + rowH * (i + 0.5);
          const size = rowH * 0.78;
          const textProps = {
            x: line.scroll ? fx + fw : fx + fw / 2,
            y: ty,
            dominantBaseline: 'central',
            textAnchor: line.scroll ? 'start' : 'middle',
            className: 't-led',
            style: { fontSize: `${size}px` },
          };
          return (
            <g key={i} className={line.scroll ? 'led-scroll' : undefined} style={line.scroll ? { '--led-travel': `${-(fw + line.text.length * size * 0.5)}px` } : undefined}>
              {/* Soft glow, then the lit dots */}
              <text {...textProps} fill="none" stroke={C.ledOn} strokeWidth={size * 0.22} opacity="0.22">{line.text}</text>
              <text {...textProps} fill={C.ledOn} stroke={C.ledOn} strokeWidth={size * 0.07} mask="url(#m-led-dots)">{line.text}</text>
            </g>
          );
        })}
      </g>
    </g>
  );
}

// ── Hanging station clock. The hands show the visitor's local time when the
// scene renders; the second hand sweeps with CSS.
export function Clock({ x, y, r = 44, chainTop }) {
  const now = new Date();
  const min = now.getMinutes();
  const hour = (now.getHours() % 12) + min / 60;
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <g aria-hidden="true">
      {chain(x, chainTop, y - r)}
      <circle cx={x} cy={y} r={r + 8} fill={C.ink} />
      <circle cx={x} cy={y} r={r} fill={C.white} {...inked(3)} />
      {ticks.map((a) => (
        <path key={a} transform={`rotate(${a} ${x} ${y})`} d={`M${x},${y - r + 5} V${y - r + (a % 90 === 0 ? 15 : 10)}`} stroke={C.ink} strokeWidth={a % 90 === 0 ? 4 : 2.5} />
      ))}
      <path transform={`rotate(${hour * 30} ${x} ${y})`} d={`M${x},${y + 5} V${y - r * 0.5}`} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
      <path transform={`rotate(${min * 6} ${x} ${y})`} d={`M${x},${y + 6} V${y - r * 0.78}`} stroke={C.ink} strokeWidth={3.5} strokeLinecap="round" />
      <g transform={`translate(${x} ${y})`}>
        <path className="clock-seconds" d={`M0,8 V${-r * 0.82}`} stroke={C.pink} strokeWidth={2} strokeLinecap="round" />
      </g>
      <circle cx={x} cy={y} r={4} fill={C.ink} />
    </g>
  );
}

// ── Yellow station name board on two posts, Indian Railways style: Hindi
// on top, English below, altitude line at the bottom. Text comes from the
// content file, never baked into the art.
export function NameBoard({ x, y, w, h, floorY, hindi, english, altitude }) {
  const postL = x + w * 0.16;
  const postR = x + w * 0.84;
  return (
    <g>
      {/* Posts */}
      {[postL, postR].map((px) => (
        <g key={px} {...inked(LINE.mid)}>
          <rect x={px - 9} y={y + h - 6} width={18} height={floorY - (y + h)} fill={C.pillar} />
          <rect x={px - 9} y={floorY - 70} width={18} height={22} fill={C.white} />
        </g>
      ))}
      <g filter="url(#f-sticker)">
        <rect x={x} y={y} width={w} height={h} rx={14} fill={C.yellow} {...inked(LINE.near)} />
        <rect x={x + 12} y={y + 12} width={w - 24} height={h - 24} rx={8} fill="none" stroke={C.ink} strokeWidth={3} />
        <text x={x + w / 2} y={y + h * 0.34} textAnchor="middle" dominantBaseline="central" className="t-board-hi" style={{ fontSize: `${h * 0.21}px` }} lang="hi">{hindi}</text>
        <text x={x + w / 2} y={y + h * 0.62} textAnchor="middle" dominantBaseline="central" className="t-board" style={{ fontSize: `${h * 0.27}px` }}>{english}</text>
        <text x={x + w / 2} y={y + h * 0.84} textAnchor="middle" dominantBaseline="central" className="t-board-small" style={{ fontSize: `${h * 0.085}px` }}>{altitude}</text>
      </g>
    </g>
  );
}

// ── Sodium lamp on a bracket under the roof edge (its glow lives in the
// atmosphere layer, see <LampGlow>).
export function Lamp({ x, y }) {
  return (
    <g {...inked(3.5)}>
      <path d={`M${x},${y - 30} V${y}`} stroke={C.girder} strokeWidth={5} />
      <path d={`M${x - 30},${y} h60 l-12,22 h-36 z`} fill={C.pillarHi} />
      <ellipse cx={x} cy={y + 26} rx={14} ry={8} fill="#FFE6A8" />
    </g>
  );
}

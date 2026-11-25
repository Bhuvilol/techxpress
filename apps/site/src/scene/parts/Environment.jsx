import { C, LINE, inked } from '../palette.js';

// ── Sky: dusk gradient with a few stars, behind everything ──────────────────
export function Sky({ box, horizonY }) {
  const stars = [
    [0.08, 0.12], [0.19, 0.3], [0.33, 0.08], [0.47, 0.22], [0.58, 0.05],
    [0.66, 0.27], [0.78, 0.14], [0.9, 0.32], [0.97, 0.09],
  ];
  const top = box.y;
  const span = horizonY - top;
  return (
    <g>
      <rect x={box.x} y={top} width={box.w} height={horizonY - top + 400} fill="url(#g-sky)" />
      {stars.map(([fx, fy], i) => (
        <circle
          key={i}
          className={i % 3 === 0 ? 'twinkle' : undefined}
          style={{ animationDelay: `${i * 0.7}s` }}
          cx={box.x + fx * box.w}
          cy={top + fy * span * 0.8}
          r={i % 2 ? 1.6 : 2.4}
          fill="#FFF1D6"
          opacity="0.8"
        />
      ))}
    </g>
  );
}

// ── Far side: the station building beyond the train, in dusk shadow ────────
// A long arcaded facade with a clock tower. Seen above the train roof and
// past the ends of the train.
export function FarBuilding({ x0, x1, baseY, towerX }) {
  const top = baseY - 150;
  const arches = [];
  for (let x = x0 + 30; x < x1 - 60; x += 92) arches.push(x);
  return (
    <g {...inked(LINE.far)}>
      {/* Main block */}
      <rect x={x0} y={top} width={x1 - x0} height={baseY - top + 300} fill={C.far} />
      {/* Cornice band */}
      <rect x={x0} y={top} width={x1 - x0} height={14} fill={C.farDark} />
      {/* Arched windows, a few lit */}
      {arches.map((x, i) => {
        const lit = [2, 5, 6, 11, 14, 17, 20].includes(i % 23);
        return (
          <path
            key={x}
            d={`M${x},${top + 110} v-46 a23,23 0 0 1 46,0 v46 z`}
            fill={lit ? C.farLit : C.farDark}
            opacity={lit ? 0.85 : 1}
          />
        );
      })}
      {/* Clock tower */}
      <g transform={`translate(${towerX},0)`}>
        <rect x={-46} y={top - 150} width={92} height={160} fill={C.far} />
        <path d={`M-58,${top - 150} L0,${top - 210} L58,${top - 150} Z`} fill={C.farDark} />
        <circle cx={0} cy={top - 96} r={26} fill="#E9D9B0" opacity="0.9" />
        <path d={`M0,${top - 96} v-16 M0,${top - 96} h11`} stroke={C.ink} strokeWidth={3} />
      </g>
    </g>
  );
}

// ── Roof: dark ceiling, trusses and the scalloped valance of an Indian ─────
// platform shed. Fans hang from it (see <Fan>).
export function Roof({ x0, x1, top, edgeY }) {
  const segs = [];
  for (let x = x0; x < x1; x += 120) segs.push(x);
  // Truss rows from the roof edge up to the top of the bleed; the higher
  // rows are dimmer, so the ceiling recedes into the dark.
  const rows = [];
  for (let y = edgeY - 70, k = 0; y > top - 60; y -= 90, k += 1) rows.push({ y, o: Math.max(0.25, 1 - k * 0.22) });
  const scallops = [];
  for (let x = x0; x < x1; x += 40) scallops.push(x);
  return (
    <g>
      <rect x={x0} y={top} width={x1 - x0} height={edgeY - top + 4} fill={C.roof} />
      {/* Trusses */}
      {rows.map(({ y, o }) => (
        <g key={y} stroke={C.girder} strokeWidth={5} fill="none" opacity={o}>
          <path d={`M${x0},${y} H${x1} M${x0},${y - 60} H${x1}`} />
          {segs.map((x) => (
            <path key={x} d={`M${x},${y} L${x + 60},${y - 60} L${x + 120},${y}`} />
          ))}
        </g>
      ))}
      {/* Valance: a band with a scalloped lower edge */}
      <rect x={x0} y={edgeY - 26} width={x1 - x0} height={26} fill={C.valance} {...inked(LINE.mid)} />
      <path
        d={`M${x0},${edgeY} ${scallops.map(() => 'a20,16 0 0 0 40,0').join(' ')} V${edgeY - 4} H${x0} Z`}
        fill={C.valanceDark}
        {...inked(LINE.mid)}
      />
    </g>
  );
}

// ── Ceiling fan: rod, motor, three blades seen from below at an angle. ────
// The blades spin inside a vertically squashed group (CSS class fan-spin).
export function Fan({ x, y, rod = 50 }) {
  const hub = y + rod;
  return (
    <g>
      <path d={`M${x},${y} V${hub}`} stroke={C.girder} strokeWidth={5} />
      <g transform={`translate(${x} ${hub}) scale(1 0.3)`}>
        <g className="fan-spin">
          {[0, 120, 240].map((a) => (
            <path
              key={a}
              transform={`rotate(${a})`}
              d="M0,0 C24,-14 96,-22 116,-6 C100,10 30,14 0,0 Z"
              fill="#4C4566"
              stroke={C.ink}
              strokeWidth={6}
              strokeLinejoin="round"
            />
          ))}
        </g>
      </g>
      <ellipse cx={x} cy={hub} rx={16} ry={9} fill="#5C5478" {...inked(3)} />
    </g>
  );
}

// ── Platform floor: coping, yellow safety line, tactile strip, joints ──────
export function Platform({ x0, x1, edgeY, bottom, vanishX }) {
  const lineY = edgeY + 24;
  const tactileY = lineY + 22;
  const jointsTop = tactileY + 30;
  const verticals = [];
  for (let x = x0 - 400; x < x1 + 400; x += 170) verticals.push(x);
  return (
    <g>
      <rect x={x0} y={edgeY} width={x1 - x0} height={bottom - edgeY} fill="url(#g-floor)" />
      {/* Coping stones along the edge */}
      <rect x={x0} y={edgeY} width={x1 - x0} height={18} fill={C.coping} {...inked(LINE.mid)} />
      {/* Yellow safety line */}
      <rect x={x0} y={lineY} width={x1 - x0} height={14} fill={C.yellow} />
      {/* Tactile strip */}
      <rect x={x0} y={tactileY} width={x1 - x0} height={26} fill="url(#p-tactile)" opacity="0.9" />
      {/* Floor joints: horizontal rows, verticals fanning out towards us */}
      <g stroke={C.stoneDark} strokeWidth={3} opacity="0.7">
        {[0.12, 0.3, 0.55].map((f) => {
          const y = jointsTop + (bottom - jointsTop) * f;
          return <path key={f} d={`M${x0},${y} H${x1}`} />;
        })}
        {verticals.map((x) => (
          <path key={x} d={`M${x},${jointsTop} L${vanishX + (x - vanishX) * 1.9},${bottom}`} />
        ))}
      </g>
    </g>
  );
}

// ── Cast-iron pillar with a bracketed capital and painted bands ────────────
export function Pillar({ x, top, bottom, w = 34 }) {
  const half = w / 2;
  return (
    <g {...inked(LINE.mid)}>
      {/* Brackets under the roof */}
      <path d={`M${x - 70},${top} Q${x - 10},${top + 10} ${x - half},${top + 70} L${x - half},${top} Z`} fill={C.pillar} />
      <path d={`M${x + 70},${top} Q${x + 10},${top + 10} ${x + half},${top + 70} L${x + half},${top} Z`} fill={C.pillar} />
      {/* Shaft */}
      <rect x={x - half} y={top} width={w} height={bottom - top} fill={C.pillar} />
      <rect x={x - half + 5} y={top} width={7} height={bottom - top} fill={C.pillarHi} stroke="none" />
      {/* Black and white bands near the floor, as painted on platforms */}
      <rect x={x - half} y={bottom - 120} width={w} height={30} fill={C.white} />
      <rect x={x - half} y={bottom - 60} width={w} height={30} fill={C.white} />
      {/* Base */}
      <rect x={x - half - 8} y={bottom - 16} width={w + 16} height={16} fill={C.pillarHi} />
    </g>
  );
}

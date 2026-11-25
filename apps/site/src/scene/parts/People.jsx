import { C, inked } from '../palette.js';

const ink = inked(4.5);

// ── The TTE (travelling ticket examiner) at the coach door: black coat,
// white shirt and trousers, maroon tie, brass badge, clipboard. Waves with
// his right arm. Drawn with the feet at (0,0), about 312 units tall.
export function Tte({ x, feetY, scale = 1, waving = true }) {
  return (
    <g transform={`translate(${x} ${feetY}) scale(${scale})`}>
      {/* Ground shadow */}
      <ellipse cx={0} cy={2} rx={58} ry={10} fill={C.shadow} opacity="0.45" />

      {/* Trousers and shoes */}
      <path d="M-32,-128 L-28,-10 L-6,-10 L-2,-104 L2,-104 L6,-10 L28,-10 L32,-128 Z" fill={C.white} {...ink} />
      <path d="M-36,-12 h34 q4,8 -2,12 h-38 q-4,-6 6,-12 z M2,-12 h34 q10,6 6,12 h-38 q-6,-4 -2,-12 z" fill={C.ink} />

      {/* Left arm (viewer's right) with clipboard, behind the coat */}
      <path d="M40,-214 Q62,-176 56,-128" fill="none" stroke={C.ink} strokeWidth={30} strokeLinecap="round" />
      <path d="M40,-214 Q62,-176 56,-128" fill="none" stroke={C.coat} strokeWidth={21} strokeLinecap="round" />

      {/* Coat */}
      <path d="M-46,-224 Q-62,-160 -52,-112 L52,-112 Q62,-160 46,-224 Q0,-242 -46,-224 Z" fill={C.coat} {...ink} />
      <path d="M-30,-226 L-6,-170 M30,-226 L6,-170" stroke={C.coatHi} strokeWidth={5} />
      {/* Shirt and tie */}
      <path d="M-17,-232 L0,-184 L17,-232 Q0,-238 -17,-232 Z" fill={C.white} {...inked(3)} />
      <path d="M-5,-226 L5,-226 L8,-182 L0,-170 L-8,-182 Z" fill="#7A2335" {...inked(3)} />
      {/* Buttons, badge and name plate */}
      <circle cx={-3} cy={-150} r={3.5} fill={C.brass} />
      <circle cx={-3} cy={-130} r={3.5} fill={C.brass} />
      <path d="M18,-206 l10,-6 l10,6 l-4,12 h-12 z" fill={C.brass} {...inked(2.5)} />
      <rect x={-40} y={-200} width={24} height={9} rx={2} fill={C.white} {...inked(2)} />

      {/* Clipboard and hand */}
      <g>
        <rect x={42} y={-166} width={40} height={52} rx={4} fill={C.paper} {...ink} transform="rotate(-8 62 -140)" />
        <rect x={54} y={-170} width={16} height={8} rx={2} fill={C.brass} {...inked(2)} transform="rotate(-8 62 -140)" />
        <circle cx={56} cy={-124} r={10} fill={C.skin} {...inked(3.5)} />
      </g>

      {/* Waving right arm (viewer's left), pivots at the shoulder */}
      <g className={waving ? 'tte-wave' : undefined} style={{ transformOrigin: '-42px -214px' }}>
        <path d="M-42,-214 Q-84,-238 -86,-292" fill="none" stroke={C.ink} strokeWidth={30} strokeLinecap="round" />
        <path d="M-42,-214 Q-84,-238 -86,-292" fill="none" stroke={C.coat} strokeWidth={21} strokeLinecap="round" />
        <path d="M-92,-296 q-4,-26 6,-30 q4,8 3,14 q6,-14 12,-12 q2,10 -4,20 q8,-6 11,-2 q-2,12 -16,20 q-10,4 -12,-10 z" fill={C.skin} {...inked(3.5)} />
      </g>

      {/* Neck and head */}
      <rect x={-9} y={-250} width={18} height={22} fill={C.skinShade} {...inked(3)} />
      <ellipse cx={-25} cy={-268} rx={6} ry={9} fill={C.skin} {...inked(3)} />
      <ellipse cx={25} cy={-268} rx={6} ry={9} fill={C.skin} {...inked(3)} />
      <ellipse cx={0} cy={-270} rx={24} ry={29} fill={C.skin} {...ink} />
      <path d="M-25,-272 Q-28,-306 0,-306 Q28,-306 25,-272 Q16,-292 0,-290 Q-16,-292 -25,-272 Z" fill={C.hair} {...inked(3)} />
      <circle cx={-9} cy={-271} r={3} fill={C.ink} />
      <circle cx={9} cy={-271} r={3} fill={C.ink} />
      <path d="M-15,-281 l9,-2 M6,-283 l9,2" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M-13,-255 Q0,-262 13,-255 Q0,-249 -13,-255 Z" fill={C.hair} />
      <path d="M-6,-247 Q0,-243 6,-247" fill="none" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}

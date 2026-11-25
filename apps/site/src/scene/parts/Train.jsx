import { C, LINE, inked } from '../palette.js';

// The TechXpress train, after the logo: a white semi-high-speed train with
// violet / pink / yellow / teal speed bands that sweep up onto the nose.
// Seen side-on, standing at the platform with one door open.
//
// Vertical metrics are fixed (scene units); compositions place and scale the
// whole group. `sill` is the door floor, level with the platform edge.
const TRAIN = { roofTop: 338, bodyTop: 372, winTop: 430, winH: 108, doorTop: 418, sill: 772 };

const T = TRAIN;
const ink = inked(LINE.mid);

// One speed band: a straight run along the body that curves up onto the nose.
// `a` and `b` are the band's top and bottom y on the body; the nose ends lift
// by `lift` so the bands fan out like the logo's swooshes.
const band = (left, R, a, b, liftA, liftB, nose) => {
  if (!nose) return `M${left},${a} H${R} V${b} H${left} Z`;
  const k = R - 90;
  return [
    `M${left},${a} H${k}`,
    `C${R + 50},${a} ${R + 170},${a - liftA * 0.55} ${R + 270},${a - liftA}`,
    `L${R + 286},${b - liftB}`,
    `C${R + 180},${b - liftB * 0.5} ${R + 60},${b} ${k},${b}`,
    `H${left} Z`,
  ].join(' ');
};

function Window({ x, lit, passenger }) {
  const w = 110;
  return (
    <g>
      <rect x={x} y={T.winTop} width={w} height={T.winH} rx={16} fill={lit ? 'url(#g-window-lit)' : 'url(#g-glass)'} {...ink} />
      {lit && passenger === 1 && (
        <path d={`M${x + 30},${T.winTop + T.winH} v-26 a22,22 0 0 1 44,0 v26 z M${x + 52},${T.winTop + 56} m-15,0 a15,15 0 1 0 30,0 a15,15 0 1 0 -30,0`} fill={C.cabinDeep} opacity="0.75" />
      )}
      {lit && passenger === 2 && (
        <path d={`M${x + 58},${T.winTop + T.winH} v-30 a20,20 0 0 1 40,0 v30 z M${x + 78},${T.winTop + 52} m-14,0 a14,14 0 1 0 28,0 a14,14 0 1 0 -28,0`} fill={C.cabinDeep} opacity="0.7" />
      )}
      {/* Glass glint */}
      <path d={`M${x + 14},${T.winTop + 30} l22,-18`} stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={lit ? 0.5 : 0.25} />
    </g>
  );
}

function Door({ x }) {
  const w = 124;
  const h = T.sill - T.doorTop;
  return (
    <g>
      {/* Sliding leaf, pushed aside over the body */}
      <rect x={x - 112} y={T.doorTop} width={106} height={h} rx={6} fill={C.body} {...ink} />
      <rect x={x - 90} y={T.doorTop + 30} width={62} height={92} rx={12} fill="url(#g-glass)" {...inked(3.5)} />
      {/* Open doorway: warm lit vestibule */}
      <rect x={x} y={T.doorTop} width={w} height={h} rx={6} fill="url(#g-cabin)" {...inked(LINE.near)} />
      <rect x={x + 14} y={T.doorTop + 14} width={w - 28} height={10} rx={5} fill="#FFE7B0" />
      <path d={`M${x + w / 2},${T.doorTop + 40} V${T.sill - 30}`} stroke={C.yellow} strokeWidth={7} strokeLinecap="round" opacity="0.9" />
      <rect x={x + 6} y={T.sill - 22} width={w - 12} height={14} rx={3} fill={C.ink} opacity="0.55" />
      {/* Grab rails either side */}
      <rect x={x - 18} y={T.doorTop + 50} width={10} height={h - 80} rx={5} fill={C.yellow} {...inked(3)} />
      <rect x={x + w + 8} y={T.doorTop + 50} width={10} height={h - 80} rx={5} fill={C.yellow} {...inked(3)} />
      {/* Coach number */}
      <text x={x + w / 2} y={T.doorTop - 12} textAnchor="middle" className="t-stencil" fill={C.violet}>TX-07</text>
    </g>
  );
}

export function Coach({ left, right, doorX, gangwayX, nose = true, plateText }) {
  const R = right;
  const windows = [];
  let i = 0;
  for (let x = left + 40; x + 110 < R - 40; x += 150) {
    const nearDoor = x + 110 > doorX - 150 && x < doorX + 150;
    const nearGangway = gangwayX != null && x + 110 > gangwayX - 50 && x < gangwayX + 50;
    if (!nearDoor && !nearGangway) windows.push({ x, lit: i % 4 !== 2, passenger: i % 3 === 0 ? 1 : i % 5 === 1 ? 2 : 0 });
    i += 1;
  }
  const acUnits = [];
  for (let x = left + 120; x < R - 200; x += 520) acUnits.push(x);

  return (
    <g>
      {/* Roof-mounted AC units */}
      {acUnits.map((x) => (
        <rect key={x} x={x} y={T.roofTop - 22} width={170} height={30} rx={10} fill={C.roofGrey} {...ink} />
      ))}

      {/* Nose (drawn first so the body's outline sits over the joint) */}
      {nose && (
        <path
          d={`M${R - 20},${T.roofTop} C${R + 150},${T.roofTop} ${R + 290},430 ${R + 325},620 C${R + 335},680 ${R + 338},730 ${R + 330},${T.sill} L${R - 20},${T.sill} Z`}
          fill={C.body}
          {...inked(LINE.near)}
        />
      )}

      {/* Roof and body */}
      <rect x={left} y={T.roofTop} width={R - left} height={T.bodyTop - T.roofTop} fill={C.roofGrey} {...ink} />
      <rect x={left} y={T.bodyTop} width={R - left} height={T.sill - T.bodyTop} fill={C.body} {...inked(LINE.near)} />
      <rect x={left} y={T.sill - 30} width={R - left + (nose ? 0 : 0)} height={30} fill={C.bodyShade} />

      {/* Speed bands, back to front */}
      <path d={band(left, R, 638, 646, 112, 104, nose)} fill={C.teal} />
      <path d={band(left, R, 646, 668, 104, 76, nose)} fill={C.violet} />
      <path d={band(left, R, 668, 696, 76, 40, nose)} fill={C.pink} />
      <path d={band(left, R, 696, 744, 40, -4, nose)} fill={C.yellow} />

      {/* Windscreen, number and headlight on the nose */}
      {nose && (
        <g>
          <path d={`M${R + 40},384 C${R + 150},386 ${R + 232},452 ${R + 268},560 C${R + 200},566 ${R + 120},566 ${R + 44},560 Z`} fill="url(#g-glass)" {...inked(LINE.near)} />
          <path d={`M${R + 80},404 l40,0 M${R + 92},424 l60,4`} stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity="0.35" />
          <text x={R + 150} y={612} textAnchor="middle" className="t-stencil" fill={C.ink}>12026</text>
          <circle className="headlight" cx={R + 302} cy={704} r={70} fill="url(#g-headlight)" />
          <ellipse cx={R + 302} cy={704} rx={15} ry={10} fill="#FFF4C2" {...inked(3)} />
        </g>
      )}

      {windows.map((w) => <Window key={w.x} {...w} />)}

      {/* Gangway bellows where two coaches meet */}
      {gangwayX != null && (
        <g>
          <rect x={gangwayX - 22} y={T.bodyTop + 8} width={44} height={T.sill - T.bodyTop - 8} fill={C.bellows} {...ink} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
            <path key={k} d={`M${gangwayX - 22},${T.bodyTop + 40 + k * 44} h44`} stroke="#3F3756" strokeWidth={4} />
          ))}
        </g>
      )}

      {/* Destination plate beside the door */}
      {plateText && (
        <g>
          <rect x={doorX - 330} y={566} width={180} height={34} rx={6} fill={C.ledCase} {...inked(3)} />
          <text x={doorX - 240} y={590} textAnchor="middle" className="t-plate" fill={C.ledOn}>{plateText}</text>
        </g>
      )}

      <Door x={doorX} />
    </g>
  );
}

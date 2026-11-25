import { fullBox } from '../layout.js';
import { Sky, FarBuilding, Roof, Fan, Platform, Pillar } from '../parts/Environment.jsx';
import { Coach } from '../parts/Train.jsx';
import { LedBoard, Clock, NameBoard, Lamp } from '../parts/Fixtures.jsx';
import { Tte } from '../parts/People.jsx';
import { LampGlow, Haze, Dust } from '../parts/Atmosphere.jsx';
import { STATION, LED } from '../../content/station.js';

// Phone composition, viewBox 0 0 1080 1920 (see layout.js). Not a squeezed
// wide scene: the train is shown larger (one door), the boards stack above.
const box = fullBox('tall');
const X0 = box.x;
const X1 = box.x + box.w;
const LAMPS = [170, 910];

// The train is drawn in its own (wide) units and scaled into place.
const TRAIN_SCALE = 1.35;
const TRAIN_TX = -790;
const TRAIN_TY = 218;
const SILL = 772 * TRAIN_SCALE + TRAIN_TY; // 1260

export default function tallLayers({ ledStatus }) {
  return {
    sky: <Sky box={box} horizonY={640} />,
    far: <FarBuilding x0={X0} x1={X1} baseY={740} towerX={1180} />,
    train: (
      <g transform={`translate(${TRAIN_TX} ${TRAIN_TY}) scale(${TRAIN_SCALE})`}>
        <Coach left={(X0 - TRAIN_TX) / TRAIN_SCALE - 20} right={1360} doorX={1100} plateText="12026 TECHXPRESS" />
      </g>
    ),
    floor: <Platform x0={X0} x1={X1} edgeY={SILL} bottom={box.y + box.h} vanishX={540} />,
    fixtures: (
      <g>
        <Roof x0={X0} x1={X1} top={box.y} edgeY={232} />
        {LAMPS.map((x) => <Lamp key={x} x={x} y={226} />)}
        <Fan x={330} y={96} rod={64} />
        <Fan x={760} y={96} rod={64} />
        <LedBoard x={50} y={268} w={980} h={150} chainTop={226} lines={[{ text: LED.headline }, { text: ledStatus, scroll: true }]} />
        <Clock x={930} y={500} r={48} chainTop={410} />
        <Pillar x={-10} top={232} bottom={1500} w={40} />
        <NameBoard x={44} y={450} w={540} h={214} floorY={1520} hindi={STATION.hindi} english={STATION.english} altitude={STATION.altitude} />
      </g>
    ),
    people: <Tte x={950} feetY={1440} scale={1.3} />,
    air: (
      <g>
        <Haze x={X0} y={900} w={box.w} h={520} />
        {LAMPS.map((x, i) => <LampGlow key={x} x={x} y={226} reach={360} delay={i * 1.9} />)}
        <Dust x={560} y={800} count={16} spread={420} />
      </g>
    ),
  };
}

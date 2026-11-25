import { fullBox } from '../layout.js';
import { Sky, FarBuilding, Roof, Fan, Platform, Pillar } from '../parts/Environment.jsx';
import { Coach } from '../parts/Train.jsx';
import { LedBoard, Clock, NameBoard, Lamp } from '../parts/Fixtures.jsx';
import { Tte } from '../parts/People.jsx';
import { LampGlow, Haze, Dust } from '../parts/Atmosphere.jsx';
import { STATION, LED } from '../../content/station.js';

// Laptop composition, viewBox 0 0 1920 1080 (see layout.js).
// Returns the art for each layer id.
const box = fullBox('wide');
const X0 = box.x;
const X1 = box.x + box.w;
const LAMPS = [300, 1150, 1900];

export default function wideLayers({ ledStatus }) {
  return {
    sky: <Sky box={box} horizonY={300} />,
    far: <FarBuilding x0={X0} x1={X1} baseY={440} towerX={1830} />,
    train: <Coach left={X0} right={1640} doorX={1100} gangwayX={230} plateText="12026 TECHXPRESS" />,
    floor: <Platform x0={X0} x1={X1} edgeY={772} bottom={box.y + box.h} vanishX={960} />,
    fixtures: (
      <g>
        <Roof x0={X0} x1={X1} top={box.y} edgeY={156} />
        {LAMPS.map((x) => <Lamp key={x} x={x} y={150} />)}
        <Fan x={520} y={140} />
        <Fan x={1700} y={140} />
        <Pillar x={40} top={156} bottom={950} />
        <Pillar x={760} top={156} bottom={950} />
        <Pillar x={1580} top={156} bottom={950} />
        <LedBoard x={880} y={176} w={520} h={112} chainTop={150} lines={[{ text: LED.headline }, { text: ledStatus, scroll: true }]} />
        <Clock x={1490} y={236} r={40} chainTop={150} />
        <NameBoard x={90} y={560} w={440} h={176} floorY={960} hindi={STATION.hindi} english={STATION.english} altitude={STATION.altitude} />
      </g>
    ),
    people: <Tte x={1300} feetY={904} />,
    air: (
      <g>
        <Haze x={X0} y={460} w={box.w} h={440} />
        {LAMPS.map((x, i) => <LampGlow key={x} x={x} y={150} delay={i * 1.7} />)}
        <Dust x={1150} y={430} />
        <Dust x={300} y={440} count={10} spread={260} />
      </g>
    ),
  };
}

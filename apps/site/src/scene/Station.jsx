import { useEffect, useRef, useState } from 'react';
import { COMPOSITIONS, LAYERS, TALL_QUERY, fullBox } from './layout.js';
import Defs from './Defs.jsx';
import wideLayers from './compositions/Wide.jsx';
import tallLayers from './compositions/Tall.jsx';
import useParallax from '../motion/useParallax.js';
import { LED } from '../content/station.js';
import '../styles/scene.css';

const useComposition = () => {
  const get = () => (window.matchMedia(TALL_QUERY).matches ? 'tall' : 'wide');
  const [name, setName] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(TALL_QUERY);
    const onChange = () => setName(get());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return name;
};

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
};

// The station scene: one <svg> per depth layer, all sharing the same viewBox,
// stacked in a fixed full-screen box.
export default function Station() {
  const composition = useComposition();
  const reduced = useReducedMotion();
  const layerRefs = useRef({});
  const tilt = useRef(null);
  const c = COMPOSITIONS[composition];
  const box = fullBox(composition);
  const art = (composition === 'tall' ? tallLayers : wideLayers)({ ledStatus: LED.status.beforeOpen });

  useParallax({ layerRefs, composition, enabled: !reduced, tilt });

  // Pause every CSS loop while the tab is hidden.
  useEffect(() => {
    const root = document.documentElement;
    const onVisibility = () => root.classList.toggle('scene-paused', document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <main className={`station station--${composition}`} data-composition={composition}>
      <Defs />
      <div className="scene" aria-hidden="true">
        {LAYERS.map(({ id }) => (
          <div key={id} className={`layer layer--${id}`} ref={(el) => { layerRefs.current[id] = el; }}>
            <svg viewBox={`0 0 ${c.width} ${c.height}`} preserveAspectRatio="xMidYMid meet" overflow="visible" focusable="false">
              {/* The bleed box keeps the browser from culling art outside the viewBox. */}
              <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" />
              {art[id]}
            </svg>
          </div>
        ))}
      </div>
    </main>
  );
}

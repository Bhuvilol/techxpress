import { useEffect } from 'react';
import { LAYERS, PARALLAX, unitScale } from '../scene/layout.js';

// Moves each layer <div> a little with the mouse (laptops) or phone tilt.
// Writes one transform per layer per frame, on composited divs, so the SVG
// art itself is never repainted. Stops when the tab is hidden or `enabled`
// is false (reduced motion / motion off).
//
// `tilt` is a ref filled by the tilt hook ({ x, y } in -1..1) or null.
export default function useParallax({ layerRefs, composition, enabled, tilt }) {
  useEffect(() => {
    const els = LAYERS.map((l) => ({ el: layerRefs.current[l.id], depth: l.depth }));
    if (!enabled) {
      els.forEach(({ el }) => { if (el) el.style.transform = ''; });
      return undefined;
    }

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    let running = false;

    const onPointer = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
      start();
    };

    const frame = () => {
      if (tilt?.current) {
        target.x = tilt.current.x;
        target.y = tilt.current.y;
      }
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      const s = unitScale(composition, window.innerWidth, window.innerHeight);
      for (const { el, depth } of els) {
        if (!el) continue;
        // Background moves against the pointer a little, the front more.
        el.style.transform = `translate3d(${(-cur.x * PARALLAX.x * depth * s).toFixed(2)}px, ${(-cur.y * PARALLAX.y * depth * s).toFixed(2)}px, 0)`;
      }
      const settled = Math.abs(target.x - cur.x) < 0.001 && Math.abs(target.y - cur.y) < 0.001;
      if (settled && !tilt?.current) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    function start() {
      if (running || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else if (tilt?.current) start();
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    if (tilt?.current) start();
    const tiltPoll = setInterval(() => { if (tilt?.current) start(); }, 500);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(tiltPoll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [layerRefs, composition, enabled, tilt]);
}

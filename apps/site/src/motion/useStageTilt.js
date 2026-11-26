// Tilts the whole stage a few degrees in 3D, following the mouse on laptops
// and phone tilt (useTilt.js) on phones. Only the rig element's transform is
// written, once per frame and only while it is still moving, so the layers
// (each its own composited plane at its own depth) are never repainted.

import { useEffect } from 'react';
import { useTiltInput } from './useTilt.js';

// Largest turn, in degrees, at the edge of the screen / full phone tilt.
export const MAX_TILT = { x: 3.2, y: 2.4 };
const EASE = 0.07;

export default function useStageTilt(rigRef, enabled) {
  const tilt = useTiltInput(enabled);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return undefined;
    if (!enabled) {
      rig.style.transform = '';
      return undefined;
    }

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    let running = false;

    const frame = () => {
      if (tilt.current) {
        target.x = tilt.current.x;
        target.y = tilt.current.y;
      }
      cur.x += (target.x - cur.x) * EASE;
      cur.y += (target.y - cur.y) * EASE;
      // Pointer right -> stage turns so the front slides left and the back
      // right, as if you stepped to the right of a diorama.
      rig.style.transform = `rotateX(${(cur.y * MAX_TILT.y).toFixed(3)}deg) rotateY(${(-cur.x * MAX_TILT.x).toFixed(3)}deg)`;
      const settled = Math.abs(target.x - cur.x) < 0.0005 && Math.abs(target.y - cur.y) < 0.0005;
      if (settled) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    const onPointer = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
      start();
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      start();
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else start();
    };
    // Tilt readings arrive outside our loop; wake it when the phone moves.
    const onOrientation = () => { if (tilt.current) start(); };

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('deviceorientation', onOrientation);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('deviceorientation', onOrientation);
      rig.style.transform = '';
    };
  }, [rigRef, enabled, tilt]);
}

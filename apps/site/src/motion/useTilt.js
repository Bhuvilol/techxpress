// Phone tilt for the stage's depth effect. requestTiltPermission and
// hasTiltPermission are part of the stage contract (src/scene/stage.js):
// the UI asks for permission from a tap, the stage listens once it exists.

import { useEffect, useRef } from 'react';

let granted = typeof window !== 'undefined'
  && typeof window.DeviceOrientationEvent !== 'undefined'
  && typeof window.DeviceOrientationEvent.requestPermission !== 'function';

// Stages waiting for permission (it can arrive after they mounted).
const waiting = new Set();

// Ask for motion access (iOS shows a prompt; other browsers need none).
// Must be called from a user gesture. Resolves true when tilt can be used.
export async function requestTiltPermission() {
  if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent === 'undefined') return false;
  const ask = window.DeviceOrientationEvent.requestPermission;
  if (typeof ask !== 'function') {
    granted = true;
  } else {
    try {
      granted = (await ask.call(window.DeviceOrientationEvent)) === 'granted';
    } catch {
      granted = false;
    }
  }
  if (granted) waiting.forEach((start) => start());
  return granted;
}

export const hasTiltPermission = () => granted;

// Degrees of tilt (from where the phone was first held) for a full -1..1.
const RANGE = 16;
const clamp = (v) => Math.max(-1, Math.min(1, v));

// Turns beta/gamma into left-right (x) and up-down (y) for the way the
// screen is currently rotated.
function screenAxes(e) {
  const angle = window.screen?.orientation?.angle ?? window.orientation ?? 0;
  const { beta, gamma } = e;
  switch ((angle + 360) % 360) {
    case 90: return [beta, -gamma];
    case 180: return [-gamma, -beta];
    case 270: return [-beta, gamma];
    default: return [gamma, beta];
  }
}

// A ref holding { x, y } in -1..1 while tilt is available, else null.
// Calibrated to the first reading (however the phone is held = centre) and
// recalibrated when the screen rotates. Smoothing is the caller's job.
export function useTiltInput(enabled) {
  const ref = useRef(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let base = null;
    let listening = false;
    const onOrientation = (e) => {
      if (e.beta == null || e.gamma == null) return;
      const [x, y] = screenAxes(e);
      if (!base) base = { x, y };
      ref.current = { x: clamp((x - base.x) / RANGE), y: clamp((y - base.y) / RANGE) };
    };
    const recalibrate = () => { base = null; };
    const start = () => {
      if (listening || !granted) return;
      listening = true;
      window.addEventListener('deviceorientation', onOrientation);
    };
    start();
    waiting.add(start);
    window.screen?.orientation?.addEventListener?.('change', recalibrate);
    return () => {
      waiting.delete(start);
      window.removeEventListener('deviceorientation', onOrientation);
      window.screen?.orientation?.removeEventListener?.('change', recalibrate);
      ref.current = null;
    };
  }, [enabled]);
  return ref;
}

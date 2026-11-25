// Phone tilt for the stage's depth effect. The stage workstream implements
// the listener; this file's exported API is part of the stage contract
// (see src/scene/stage.js).

let granted = typeof window !== 'undefined'
  && typeof window.DeviceOrientationEvent !== 'undefined'
  && typeof window.DeviceOrientationEvent.requestPermission !== 'function';

// Ask for motion access (iOS shows a prompt; other browsers need none).
// Must be called from a user gesture. Resolves true when tilt can be used.
export async function requestTiltPermission() {
  if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent === 'undefined') return false;
  const ask = window.DeviceOrientationEvent.requestPermission;
  if (typeof ask !== 'function') {
    granted = true;
    return true;
  }
  try {
    granted = (await ask.call(window.DeviceOrientationEvent)) === 'granted';
  } catch {
    granted = false;
  }
  return granted;
}

export const hasTiltPermission = () => granted;

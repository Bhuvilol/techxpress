import { EVENT, LED } from '../content/station.js';

// TUNING TABLE for everything the stage draws ON TOP of the cutout art.
// Every box is a fraction (0..1) of the piece's fitted image box, so the
// overlays follow the art at any size. When new art arrives, open it, find
// the painted area (board face, clock face, door...) and update the numbers
// here; nothing else needs to change.

export const OVERLAYS = {
  // The yellow station name board: area for the three painted lines.
  nameboard: {
    // Measured on nameboard.webp: the yellow face inside the black line.
    box: { x: 0.11, y: 0.155, w: 0.78, h: 0.31 },
    // Line heights as fractions of the box height.
    hindi: 0.34,
    english: 0.42,
    altitude: 0.13,
  },
  // The LED indicator: the black panel where the dots light up.
  ledboard: {
    // Measured on ledboard.webp: the dark dot field inside the frame.
    box: { x: 0.11, y: 0.42, w: 0.78, h: 0.35 },
    // Dot pitch as a fraction of the panel height (≈ rows of LEDs).
    pitch: 1 / 26,
  },
  // The clock face: centre and radius (radius as a fraction of the box width).
  clock: { cx: 0.5, cy: 0.4, r: 0.4 },
  // Where the overhead wire hangs on each mast (the end of the arm).
  mast: { wireAt: { x: 0.5, y: 0.06 }, contactDrop: 0.06 },
  // The train's door (clickable when open), centred on the manifest `doorAt`.
  trainDoor: { w: 0.07, y: 0.2, h: 0.72 },
};

// Converts a fraction box to scene units inside a piece box.
export const subBox = (box, f) => ({ x: box.w * f.x, y: box.h * f.y, w: box.w * f.w, h: box.h * f.h });

// Which status line to show, from the event dates (India time).
export function ledStatus(now = Date.now()) {
  const day = (d) => Date.parse(`${d}T00:00:00+05:30`);
  if (now >= Date.parse(EVENT.startsAt)) return LED.status.departed;
  if (now >= day(EVENT.registrationClosesOn) + 864e5) return LED.status.closed;
  if (now >= day(EVENT.registrationOpensOn)) return LED.status.open;
  return LED.status.beforeOpen;
}

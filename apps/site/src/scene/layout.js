// The scene coordinate system. Everything is placed in fixed scene units,
// never in vw/vh, so the layers can't drift apart on odd screen shapes.
//
// Each composition has a viewBox (the SAFE AREA: always fully on screen,
// everything you can tap lives inside it) and a BLEED (extra art drawn past
// the edges, shown when the screen is wider or taller than the viewBox).
// The stage fits the viewBox to the screen (meet) and lets the bleed show.

export const COMPOSITIONS = {
  wide: {
    width: 1920,
    height: 1080,
    bleed: { left: 340, right: 340, top: 440, bottom: 440 },
  },
  tall: {
    width: 1080,
    height: 1920,
    bleed: { left: 240, right: 240, top: 340, bottom: 340 },
  },
};

// Portrait screens get the tall composition, everything else the wide one.
export const TALL_QUERY = '(max-aspect-ratio: 1/1)';

// Back to front. `depth` scales the parallax shift (0 = still, 1 = most).
export const LAYERS = [
  { id: 'sky', depth: 0.05 },
  { id: 'far', depth: 0.12 },
  { id: 'train', depth: 0.25 },
  { id: 'floor', depth: 0.35 },
  { id: 'fixtures', depth: 0.55 },
  { id: 'people', depth: 0.75 },
  { id: 'air', depth: 1 },
];

// Largest parallax shift (scene units) for the front layer.
export const PARALLAX = { x: 26, y: 14 };

// Full drawable box of a composition, including the bleed.
export const fullBox = (name) => {
  const c = COMPOSITIONS[name];
  return {
    x: -c.bleed.left,
    y: -c.bleed.top,
    w: c.width + c.bleed.left + c.bleed.right,
    h: c.height + c.bleed.top + c.bleed.bottom,
  };
};

// How many screen pixels one scene unit takes for a viewport (meet scaling).
export const unitScale = (name, vw, vh) => {
  const c = COMPOSITIONS[name];
  return Math.min(vw / c.width, vh / c.height);
};

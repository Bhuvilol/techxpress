// THE STAGE CONTRACT. Shared by the cutout pipeline, the stage renderer and
// the UI. Change it only on purpose: every workstream builds against it.
//
// The landing scene is a paper theatre: every piece is a flat cardboard
// cutout image (made in Gemini, background removed by scripts/cutout.mjs)
// standing in a depth slot. Coordinates are scene units in the fixed
// compositions from layout.js (wide 1920x1080, tall 1080x1920, plus bleed).

// Depth slots, back (1) to front (8). `depth` scales parallax / 3D tilt.
export const STAGE_LAYERS = [
  { id: 'backdrop', depth: 0.04 }, // 1 sky
  { id: 'heavens', depth: 0.1 }, // 2 sun, birds
  { id: 'far', depth: 0.18 }, // 3 platform 2
  { id: 'masts', depth: 0.26 }, // 4 electricity masts + wires
  { id: 'train', depth: 0.36 }, // 5 train
  { id: 'platform', depth: 0.5 }, // 6 platform 1, lamp posts
  { id: 'props', depth: 0.68 }, // 7 boards, clock, kiosk, chai stall
  { id: 'cast', depth: 0.85 }, // 8 Rajesh
];

// Every cutout. `layer` is a STAGE_LAYERS id. `states` > 1 means the source
// image holds that many drawings (split by the pipeline, see README.md).
// `hotspot` names the panel the piece opens (see ui/), if any.
export const PIECES = {
  sky: { layer: 'backdrop', states: 1, fit: 'cover', variants: ['wide', 'tall'] },
  sun: { layer: 'heavens', states: 1 },
  birds: { layer: 'heavens', states: 2 },
  platform2: { layer: 'far', states: 1 },
  mast: { layer: 'masts', states: 1, repeat: true },
  train: { layer: 'train', states: 2 }, // A door closed, B door open
  platform1: { layer: 'platform', states: 1 },
  lamp: { layer: 'platform', states: 2, repeat: true }, // A off, B on
  nameboard: { layer: 'props', states: 1, hotspot: 'about' },
  ledboard: { layer: 'props', states: 1, hotspot: 'countdown' },
  clock: { layer: 'props', states: 1 },
  kiosk: { layer: 'props', states: 1, hotspot: 'faq' },
  chai: { layer: 'props', states: 2 },
  timetable: { layer: 'props', states: 1, hotspot: 'timetable' },
  rajesh: { layer: 'cast', states: 2, hotspot: 'book' }, // A standing, B waving
};

// Where each piece stands, per composition. A box {x, y, w, h}: the image is
// fitted inside it, centred horizontally and standing on the box's bottom
// edge (preserveAspectRatio xMidYMax meet). `instances` repeats a piece.
// The train is special: it is placed by its height, its bottom edge, and the
// screen x where its DOOR must stop (`doorX`); the door's position inside the
// image is `doorAt` (0..1 of image width) in the manifest.
export const SLOTS = {
  wide: {
    sky: { x: -340, y: -440, w: 2600, h: 1960 },
    sun: { x: 1710, y: 110, w: 200, h: 200 },
    birds: { x: 560, y: 40, w: 240, h: 120 },
    platform2: { instances: [{ x: -340, y: 270, w: 640, h: 220 }, { x: 292, y: 270, w: 640, h: 220 }, { x: 924, y: 270, w: 640, h: 220 }, { x: 1556, y: 270, w: 640, h: 220 }, { x: 2188, y: 270, w: 640, h: 220 }] },
    mast: { instances: [{ x: 60, y: 140, w: 130, h: 570 }, { x: 900, y: 140, w: 130, h: 570 }, { x: 1740, y: 140, w: 130, h: 570 }] },
    train: { h: 470, bottom: 830, doorX: 830 },
    // Wider and taller than the screen on purpose: its top surface hides the
    // train's wheels (like a real platform edge) and it reaches the bottom of
    // the bleed. The sides are cropped.
    platform1: { x: -930, y: 630, w: 3780, h: 890 },
    lamp: { instances: [{ x: 820, y: 140, w: 270, h: 740 }, { x: 1440, y: 140, w: 270, h: 740 }] },
    nameboard: { x: 10, y: 470, w: 540, h: 410 },
    ledboard: { x: 800, y: -85, w: 460, h: 280 },
    clock: { x: 1300, y: -75, w: 150, h: 180 },
    timetable: { x: 1020, y: 430, w: 200, h: 450 },
    chai: { x: 1210, y: 450, w: 340, h: 430 },
    kiosk: { x: 1560, y: 480, w: 360, h: 400 },
    rajesh: { x: 545, y: 420, w: 230, h: 460 },
  },
  tall: {
    sky: { x: -240, y: -340, w: 1560, h: 2600 },
    sun: { x: 780, y: 160, w: 240, h: 240 },
    birds: { x: 80, y: 440, w: 220, h: 110 },
    platform2: { instances: [{ x: -240, y: 600, w: 560, h: 200 }, { x: 312, y: 600, w: 560, h: 200 }, { x: 864, y: 600, w: 560, h: 200 }] },
    mast: { instances: [{ x: 10, y: 470, w: 110, h: 540 }, { x: 490, y: 470, w: 110, h: 540 }, { x: 970, y: 470, w: 110, h: 540 }] },
    train: { h: 560, bottom: 1320, doorX: 600 },
    platform1: { x: -2056, y: 1038, w: 5192, h: 1222 },
    lamp: { instances: [{ x: 400, y: 700, w: 250, h: 700 }, { x: 940, y: 700, w: 250, h: 700 }] },
    nameboard: { x: 10, y: 1070, w: 430, h: 330 },
    ledboard: { x: 140, y: -110, w: 800, h: 460 },
    clock: { x: 880, y: 690, w: 150, h: 180 },
    timetable: { x: 920, y: 1070, w: 150, h: 330 },
    kiosk: { x: 40, y: 1360, w: 360, h: 300 },
    chai: { x: 640, y: 1240, w: 420, h: 420 },
    rajesh: { x: 740, y: 920, w: 230, h: 480 },
  },
};

// The opening, once per session (ms from start). `enter`: how the piece
// arrives. 'fade' | 'rise' (slides up from below the stage floor with a
// spring overshoot) | 'swing' (rotates up from flat, pivot at the bottom) |
// 'slide-in' (train: from off-screen left to its stop) | 'state:B' (swap to
// the second drawing) | 'ui' (button and hints).
export const INTRO = [
  { at: 0, piece: 'sky', enter: 'fade' },
  { at: 400, piece: 'birds', enter: 'rise' },
  { at: 700, piece: 'sun', enter: 'rise' },
  { at: 1200, piece: 'platform2', enter: 'rise' },
  { at: 1600, piece: 'mast', enter: 'rise', stagger: 140 },
  { at: 2100, piece: 'platform1', enter: 'rise' },
  { at: 2200, piece: 'lamp', enter: 'rise', stagger: 120 },
  { at: 2500, piece: 'nameboard', enter: 'swing' },
  { at: 2900, piece: 'ledboard', enter: 'rise' },
  { at: 3000, piece: 'clock', enter: 'rise' },
  { at: 3050, piece: 'timetable', enter: 'rise' },
  { at: 3100, piece: 'kiosk', enter: 'rise' },
  { at: 3150, piece: 'chai', enter: 'rise' },
  { at: 3300, piece: 'train', enter: 'slide-in', duration: 1000 },
  { at: 4300, piece: 'train', enter: 'state:B' },
  { at: 4600, piece: 'rajesh', enter: 'rise' },
  { at: 5200, piece: null, enter: 'ui' },
];
export const INTRO_TOTAL_MS = 5600;

// Living stage after the intro: two-state loops (ms per state), "boil".
export const LOOPS = {
  birds: { period: 650 },
  chai: { period: 900 },
  rajesh: { period: 1400, pauseBetween: 4000 },
  lamp: { flicker: true },
  boil: { period: 420, maxShift: 1, maxRotateDeg: 0.3 },
};

// ── Interfaces between the stage and the UI ────────────────────────────────
//
// <Station> (src/scene/Station.jsx, default export) renders the full-screen
// stage and nothing else. Props:
//   onHotspot(name)   called when a piece with a `hotspot` (or the open train
//                     door, name 'book') is clicked or activated by keyboard.
//   dimmed            true while a panel is open: the stage dims slightly and
//                     its hotspots leave the tab order.
//   onIntroDone()     called once the opening has finished or been skipped
//                     (immediately for returning visitors / reduced motion).
// The stage owns its Skip button. The UI (src/ui/) owns everything else on
// top: menu, "Book your ticket", hints, panels.
//
// Tilt: src/motion/useTilt.js exports
//   requestTiltPermission(): Promise<boolean>   call from a user tap (iOS asks)
// and the stage listens to device orientation once permission exists.

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
    sun: { x: 1380, y: 110, w: 300, h: 300 },
    birds: { x: 280, y: 110, w: 520, h: 170 },
    platform2: { x: -340, y: 420, w: 2600, h: 280 },
    mast: { instances: [{ x: 60, y: 140, w: 130, h: 570 }, { x: 900, y: 140, w: 130, h: 570 }, { x: 1740, y: 140, w: 130, h: 570 }] },
    train: { h: 470, bottom: 830, doorX: 1050 },
    platform1: { x: -340, y: 760, w: 2600, h: 760 },
    lamp: { instances: [{ x: 380, y: 250, w: 110, h: 620 }, { x: 1560, y: 250, w: 110, h: 620 }] },
    nameboard: { x: 60, y: 520, w: 440, h: 330 },
    ledboard: { x: 720, y: 150, w: 560, h: 160 },
    clock: { x: 1320, y: 150, w: 140, h: 170 },
    timetable: { x: 520, y: 600, w: 140, h: 320 },
    chai: { x: 680, y: 650, w: 280, h: 300 },
    kiosk: { x: 1420, y: 540, w: 420, h: 420 },
    rajesh: { x: 1130, y: 500, w: 210, h: 450 },
  },
  tall: {
    sky: { x: -240, y: -340, w: 1560, h: 2600 },
    sun: { x: 640, y: 360, w: 280, h: 280 },
    birds: { x: 80, y: 300, w: 440, h: 150 },
    platform2: { x: -240, y: 820, w: 1560, h: 240 },
    mast: { instances: [{ x: 10, y: 520, w: 110, h: 540 }, { x: 490, y: 520, w: 110, h: 540 }, { x: 970, y: 520, w: 110, h: 540 }] },
    train: { h: 560, bottom: 1320, doorX: 470 },
    platform1: { x: -240, y: 1290, w: 1560, h: 970 },
    lamp: { instances: [{ x: 20, y: 760, w: 100, h: 580 }, { x: 960, y: 760, w: 100, h: 580 }] },
    nameboard: { x: 40, y: 560, w: 520, h: 360 },
    ledboard: { x: 60, y: 220, w: 960, h: 210 },
    clock: { x: 860, y: 500, w: 160, h: 190 },
    timetable: { x: 880, y: 1130, w: 160, h: 360 },
    kiosk: { x: 40, y: 1380, w: 480, h: 400 },
    chai: { x: 600, y: 1460, w: 440, h: 320 },
    rajesh: { x: 600, y: 1000, w: 260, h: 540 },
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

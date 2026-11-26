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
  { id: 'props', depth: 0.68 }, // 7 boards, kiosk, chai stall
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
  kiosk: { layer: 'props', states: 1, hotspot: 'faq' },
  chai: { layer: 'props', states: 2, hotspot: 'faq' }, // the chaiwala answers questions too
  timetable: { layer: 'cast', states: 1, hotspot: 'timetable' }, // stands in front, level with Rajesh
  rajesh: { layer: 'cast', states: 2, hotspot: 'book' }, // A standing, B waving
};

// Where each piece stands, per composition. A box {x, y, w, h}: the image is
// fitted inside it, centred horizontally and standing on the box's bottom
// edge (preserveAspectRatio xMidYMax meet). `instances` repeats a piece.
// The train is special: it is placed by its height, its bottom edge, and the
// screen x where its DOOR must stop (`doorX`); the door's position inside the
// image is `doorAt` (0..1 of image width) in the manifest.
// Wide screens: the front group (boards, lamps, Rajesh, chai, kiosk) is
// scaled as one canvas around its bottom centre, then that point is moved to
// the lower centre of the screen. The slot numbers below stay as tuned; only
// FRONT_GROUP changes the group's size and place.
const FRONT_GROUP = { ids: ['lamp', 'nameboard', 'timetable', 'chai', 'kiosk', 'rajesh'], scale: 0.88, toX: 960, toBottom: 1060 };

function scaleGroup(slots, { ids, scale, toX, toBottom }) {
  const boxes = ids.flatMap((id) => slots[id].instances ?? [slots[id]]);
  const left = Math.min(...boxes.map((b) => b.x));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  const cx = (left + right) / 2;
  const move = (b) => ({
    ...b,
    x: toX + (b.x - cx) * scale,
    y: toBottom + (b.y - bottom) * scale,
    w: b.w * scale,
    h: b.h * scale,
  });
  for (const id of ids) {
    const slot = slots[id];
    slots[id] = slot.instances ? { ...slot, instances: slot.instances.map(move) } : move(slot);
  }
  return slots;
}

export const SLOTS = {
  wide: scaleGroup({
    sky: { x: -340, y: -440, w: 2600, h: 1960 },
    sun: { x: 1480, y: 30, w: 180, h: 180 },
    birds: { x: 560, y: 40, w: 240, h: 120 },
    // Shown at its real shape, twice side by side to span the width; the
    // second copy is mirrored (scene.css) so the join reads as one platform.
    platform2: { instances: [{ x: -340, y: 250, w: 1300, h: 280 }, { x: 960, y: 250, w: 1300, h: 280 }] },
    mast: { instances: [{ x: 45, y: 30, w: 160, h: 680 }, { x: 885, y: 30, w: 160, h: 680 }, { x: 1725, y: 30, w: 160, h: 680 }] },
    train: { h: 470, bottom: 830, doorX: 910 },
    // Wider and taller than the screen on purpose: its top surface hides the
    // train's wheels (like a real platform edge) and it reaches the bottom of
    // the bleed. The sides are cropped.
    platform1: { x: -930, y: 630, w: 3780, h: 890 },
    lamp: { instances: [{ x: 170, y: 150, w: 240, h: 680 }, { x: 1400, y: 150, w: 240, h: 680 }] },
    nameboard: { x: -70, y: 410, w: 600, h: 490 },
    ledboard: { x: 800, y: 0, w: 460, h: 260 },
    timetable: { x: 460, y: 390, w: 320, h: 640 },
    chai: { x: 1490, y: 400, w: 500, h: 610 },
    kiosk: { x: 1630, y: 330, w: 520, h: 510 },
    rajesh: { x: 1145, y: 430, w: 300, h: 600 },
  }, FRONT_GROUP),
  tall: {
    sky: { x: -240, y: -340, w: 1560, h: 2600 },
    sun: { x: 60, y: 330, w: 240, h: 240 },
    birds: { x: 150, y: 220, w: 300, h: 150 },
    platform2: { x: -240, y: 474, w: 1560, h: 336 },
    mast: { instances: [{ x: 0, y: 370, w: 130, h: 640 }, { x: 480, y: 370, w: 130, h: 640 }, { x: 960, y: 370, w: 130, h: 640 }] },
    train: { h: 560, bottom: 1320, doorX: 400 },
    platform1: { x: -2056, y: 1038, w: 5192, h: 1222 },
    // One lamp, kept clear of the train door.
    lamp: { instances: [{ x: 60, y: 640, w: 230, h: 700 }] },
    // Front rows: name board + timetable, then Rajesh + chai stall, all above
    // the ticket button. No kiosk on phones (the chai stall opens the FAQ).
    nameboard: { x: 0, y: 940, w: 560, h: 440 },
    // Top right, hanging from the top of the screen (chains: scene.css).
    ledboard: { x: 380, y: 60, w: 680, h: 393 },
    timetable: { x: 720, y: 840, w: 350, h: 600, layer: 'platform' },
    chai: { x: 400, y: 1140, w: 680, h: 610 },
    rajesh: { x: 90, y: 1140, w: 310, h: 610 },
  },
};

// The opening, once per session, in two parts.
//
// 1. Boarding (BOOT): a black screen; the LED board drops in on its chains
//    and its dots scramble while the rest of the art loads unseen. It lasts
//    at least BOOT_MIN_MS, longer if the art is still loading.
// 2. INTRO (ms from its start): the LED text locks in, the sun rises, a
//    circle opens from the sun's centre and shows the whole station except
//    the train, then the train pulls in from the left.
//
// `enter`: 'drop' (falls from above and swings on its chains) | 'sunrise'
// (slides in from its side of the screen) | 'reveal' (a hole in the black curtain grows
// from the sun's centre; the LED board and sun sit above the curtain) | 'slide-in' (train: from
// off-screen left to its stop) | 'state:B' (swap to the second drawing) |
// 'ui' (logo, buttons and hints).
export const BOOT_MIN_MS = 2600;
export const LED_RESOLVE_MS = 900;
export const BOOT = [{ at: 0, piece: 'ledboard', enter: 'drop' }];
// Strict order: the LED text locks in (0..LED_RESOLVE_MS), then the sun
// rises, then the reveal, then the train.
export const INTRO = [
  { at: LED_RESOLVE_MS + 200, piece: 'sun', enter: 'sunrise' },
  { at: LED_RESOLVE_MS + 1700, piece: null, enter: 'reveal' },
  { at: LED_RESOLVE_MS + 2800, piece: 'train', enter: 'slide-in', duration: 1300 },
  { at: LED_RESOLVE_MS + 4400, piece: 'train', enter: 'state:B' },
  { at: LED_RESOLVE_MS + 4500, piece: null, enter: 'ui' },
];
export const INTRO_TOTAL_MS = LED_RESOLVE_MS + 4900;

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

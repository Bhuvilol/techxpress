// Where every cutout ends up, in scene units, for one composition.
// Turns the SLOTS boxes from stage.js plus the image sizes from the manifest
// into one fitted box per piece instance.

import { PIECES, SLOTS, STAGE_LAYERS } from './stage.js';
import { artFor } from './assets.js';

// Shape used for the train placeholder until the real image exists.
const TRAIN_FALLBACK = { aspect: 2400 / 610, doorAt: 0.47 };

// xMidYMax meet: as large as fits, centred, standing on the slot's floor.
// 'cover' (the sky): fills the slot, centred both ways, cropping the rest.
export function fitBox(slot, art, fit) {
  if (!art) return { x: slot.x, y: slot.y, w: slot.w, h: slot.h };
  const s = fit === 'cover'
    ? Math.max(slot.w / art.w, slot.h / art.h)
    : Math.min(slot.w / art.w, slot.h / art.h);
  const w = art.w * s;
  const h = art.h * s;
  return {
    x: slot.x + (slot.w - w) / 2,
    y: fit === 'cover' ? slot.y + (slot.h - h) / 2 : slot.y + slot.h - h,
    w,
    h,
  };
}

// The train stands on `bottom`, is `h` tall, and stops with its door at doorX.
function trainBox(slot, art) {
  const aspect = art ? art.w / art.h : TRAIN_FALLBACK.aspect;
  const doorAt = art?.doorAt ?? TRAIN_FALLBACK.doorAt;
  const w = slot.h * aspect;
  return { box: { x: slot.doorX - doorAt * w, y: slot.bottom - slot.h, w, h: slot.h }, doorAt };
}

const depthOf = Object.fromEntries(STAGE_LAYERS.map((l) => [l.id, l.depth]));

// One entry per piece instance: { key, id, index, layer, depth, box, art,
// states, hotspot, fit, doorAt }.
export function placePieces(composition) {
  const slots = SLOTS[composition];
  const out = [];
  for (const [id, piece] of Object.entries(PIECES)) {
    const slot = slots[id];
    if (!slot) continue;
    const art = artFor(id, composition);
    const base = {
      id,
      layer: piece.layer,
      depth: depthOf[piece.layer],
      art,
      states: piece.states,
      hotspot: piece.hotspot ?? null,
      fit: piece.fit ?? 'meet',
    };
    if (id === 'train') {
      const { box, doorAt } = trainBox(slot, art);
      out.push({ ...base, key: id, index: 0, box, doorAt });
      continue;
    }
    const instances = slot.instances ?? [slot];
    instances.forEach((s, index) => {
      out.push({ ...base, key: instances.length > 1 ? `${id}-${index}` : id, index, box: fitBox(s, art, base.fit) });
    });
  }
  return out;
}

// Every image URL the composition needs (for preloading before the intro).
export const allSources = (placements) => [...new Set(placements.flatMap((p) => p.art?.srcs ?? []))];

// Small stable number per string, so each piece gets its own loop phase.
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Cutout pipeline for the paper-theatre landing scene.
//
// Turns raw Gemini images (one per piece in src/scene/stage.js PIECES) into
// clean, transparent, web-ready WebP cutouts plus a manifest.json that the
// stage renderer reads. See apps/site/src/assets/stage/README.md.
//
//   node scripts/cutout.mjs <sourceDir> [--out=apps/site/src/assets/stage]
//        [--only=birds,train] [--door=0.47] [--dry-run]
//
// Steps per piece: find the source file -> remove the background (unless the
// piece is full-frame, like the sky) -> split two-drawing images -> trim ->
// give all drawings one canvas, aligned bottom-centre -> resize -> WebP ->
// merge into manifest.json.
//
// Only sharp and Node built-ins. All pixel work is done on raw RGBA buffers
// so the logic stays readable and testable.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { PIECES } from '../apps/site/src/scene/stage.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_OUT = resolve(HERE, '../apps/site/src/assets/stage');

// ── Tunables ────────────────────────────────────────────────────────────────

// Longest side of the exported image, per piece (never upscaled).
const MAX_SIDE = { train: 2600, platform1: 2600, platform2: 2600, sky: 2560 };
const DEFAULT_MAX_SIDE = 1400;

// An image "already has alpha" when more than this share of pixels is
// noticeably transparent. A few soft pixels don't count: some exporters add
// an alpha channel that is fully opaque apart from rounding noise.
const REAL_ALPHA_SHARE = 0.02;

// Opaque islands smaller than this share of the image area are specks left
// over from keying (noise in the background) and get removed.
const SPECK_SHARE = 0.0005;

// Transparent margin around each trimmed drawing, as a share of its size.
const TRIM_MARGIN = 0.02;

// Green keying: a pixel's "greenness" is g - max(r, b), compared with the
// background's own greenness. At or above HI it is background (alpha 0); at or
// below LO it is subject (alpha 255); in between alpha fades, which gives the
// anti-aliased edge partial transparency instead of a hard jagged cut.
const GREEN_LO = 0.18;
const GREEN_HI = 0.5;

const WEBP_ALPHA = { quality: 82, alphaQuality: 90, effort: 5 };
const WEBP_SKY = { quality: 78, effort: 5 };

// ── Small helpers ───────────────────────────────────────────────────────────

const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const dist = (r, g, b, c) => Math.sqrt((r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2);
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

// An image here is { data: Uint8Array RGBA, width, height }.
export function makeImage(width, height) {
  return { data: new Uint8Array(width * height * 4), width, height };
}

/** Load any image file as raw 8-bit sRGB RGBA. */
export async function loadImage(file) {
  const { data, info } = await sharp(file)
    .rotate() // honour EXIF orientation if a JPEG carries one
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

// ── 1. Finding source files ─────────────────────────────────────────────────

const SOURCE_RE = /^(\d+)-([a-z0-9]+)(?:-(wide|tall))?\.(png|jpe?g|webp)$/i;

/**
 * Map files in a folder to piece ids. Returns
 * { sources: { id: { file } | { variants: { wide: file, tall: file } } },
 *   warnings: [...] }.
 */
export function findSources(dir, pieces = PIECES, only = null) {
  const warnings = [];
  const sources = {};
  const files = readdirSync(dir).filter((f) => !f.startsWith('.')).sort();
  for (const f of files) {
    const m = SOURCE_RE.exec(f);
    const id = m && m[2].toLowerCase();
    if (!m || !pieces[id]) {
      if (/\.(png|jpe?g|webp)$/i.test(f)) warnings.push(`unknown source name "${f}" (expected like 03-birds.png with a piece id from stage.js), skipped`);
      continue;
    }
    if (only && !only.includes(id)) continue;
    const piece = pieces[id];
    const file = join(dir, f);
    if (piece.variants) {
      // A variant-less file for a variant piece is taken as its first variant.
      const variant = (m[3] || piece.variants[0]).toLowerCase();
      if (!m[3]) warnings.push(`"${f}" has no -wide/-tall suffix, used as the ${variant} ${id}`);
      sources[id] ??= { variants: {} };
      if (sources[id].variants[variant]) warnings.push(`two sources for ${id}-${variant}, using ${basename(sources[id].variants[variant])}, ignoring "${f}"`);
      else sources[id].variants[variant] = file;
    } else {
      if (m[3]) warnings.push(`"${f}": ${id} has no variants, the -${m[3]} suffix is ignored`);
      if (sources[id]) warnings.push(`two sources for ${id}, using ${basename(sources[id].file)}, ignoring "${f}"`);
      else sources[id] = { file };
    }
  }
  for (const id of Object.keys(pieces)) {
    if (only && !only.includes(id)) continue;
    if (!sources[id]) warnings.push(`no source image for "${id}"`);
    else if (pieces[id].variants) {
      for (const v of pieces[id].variants) if (!sources[id].variants[v]) warnings.push(`no source image for ${id}-${v}`);
    }
  }
  return { sources, warnings };
}

// ── 2. Background analysis ──────────────────────────────────────────────────

/** True when a meaningful share of the pixels is already transparent. */
export function hasRealAlpha(img) {
  const { data } = img;
  const n = data.length / 4;
  let soft = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) soft++;
  return soft / n > REAL_ALPHA_SHARE;
}

/** Pixels of a band around the edge, a few px thick. */
function borderPixels(img) {
  const { data, width: w, height: h } = img;
  const t = Math.max(2, Math.round(Math.min(w, h) * 0.01));
  const out = [];
  for (let y = 0; y < h; y++) {
    const edgeRow = y < t || y >= h - t;
    for (let x = 0; x < w; x++) {
      if (!edgeRow && x >= t && x < w - t) continue;
      const i = (y * w + x) * 4;
      out.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  return out;
}

function meanColour(px) {
  const s = [0, 0, 0];
  for (const p of px) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }
  return s.map((v) => v / Math.max(1, px.length));
}

/**
 * Is a line of pixels a regular two-tone alternation (a drawn checkerboard)?
 * Each pixel is labelled with the nearer of the two colours; the runs of equal
 * labels must be many and of near-constant length.
 */
function isRegularAlternation(line, c1, c2) {
  const runs = [];
  let prev = -1;
  let len = 0;
  for (const [r, g, b] of line) {
    const d1 = dist(r, g, b, c1);
    const d2 = dist(r, g, b, c2);
    if (Math.min(d1, d2) > 40) { prev = -1; len = 0; runs.push(-1); continue; } // something else
    const lab = d1 <= d2 ? 0 : 1;
    if (lab === prev) len++;
    else { if (prev !== -1) runs.push(len); prev = lab; len = 1; }
  }
  // Drop the partial first/last runs and anything interrupted by foreign colour.
  const inner = runs.slice(1).filter((v) => v > 0);
  if (inner.length < 4) return false;
  const mean = inner.reduce((a, b) => a + b, 0) / inner.length;
  if (mean < 3) return false; // per-pixel noise, not squares
  const sd = Math.sqrt(inner.reduce((a, b) => a + (b - mean) ** 2, 0) / inner.length);
  return sd / mean < 0.3;
}

/**
 * Look at the border and decide what kind of background this is:
 *   { kind: 'green',   colours: [bg] }
 *   { kind: 'uniform', colours: [bg] }        plain white or any flat colour
 *   { kind: 'checker', colours: [c1, c2] }    a FAKE drawn checkerboard
 *   { kind: 'varied',  colours: [maybe bg] }  no clean background found
 */
export function analyseBorder(img) {
  const px = borderPixels(img);
  const n = px.length;

  // Green first, judged by dominance rather than exact colour, because
  // Gemini's "pure #00FF00" comes out as many slightly different greens.
  const greens = px.filter(([r, g, b]) => g - Math.max(r, b) > 60);
  if (greens.length / n >= 0.7) return { kind: 'green', colours: [meanColour(greens)], coverage: greens.length / n };

  // Otherwise find the two most common colours (coarse 16-level buckets).
  const buckets = new Map();
  for (const p of px) {
    const k = (p[0] >> 4) * 256 + (p[1] >> 4) * 16 + (p[2] >> 4);
    const e = buckets.get(k);
    if (e) { e.n++; e.s[0] += p[0]; e.s[1] += p[1]; e.s[2] += p[2]; } else buckets.set(k, { n: 1, s: [...p] });
  }
  const ranked = [...buckets.values()].sort((a, b) => b.n - a.n).map((e) => ({ n: e.n, c: e.s.map((v) => v / e.n) }));
  const c1 = ranked[0].c;
  const near = (c, tol = 30) => px.filter(([r, g, b]) => dist(r, g, b, c) <= tol).length / n;
  const cov1 = near(c1);
  if (cov1 >= 0.8) return { kind: 'uniform', colours: [c1], coverage: cov1 };

  const second = ranked.find((e) => dist(e.c[0], e.c[1], e.c[2], c1) > 30);
  if (second) {
    const c2 = second.c;
    const both = px.filter(([r, g, b]) => dist(r, g, b, c1) <= 30 || dist(r, g, b, c2) <= 30).length / n;
    if (both >= 0.75) {
      const { data, width: w, height: h } = img;
      const row = (y) => Array.from({ length: w }, (_, x) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2]]; });
      const col = (x) => Array.from({ length: h }, (_, y) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2]]; });
      const lines = [row(0), row(h - 1), col(0), col(w - 1)];
      const regular = lines.filter((l) => isRegularAlternation(l, c1, c2)).length;
      if (regular >= 2) return { kind: 'checker', colours: [c1, c2], coverage: both };
    }
  }
  return { kind: 'varied', colours: cov1 >= 0.5 ? [c1] : [], coverage: cov1 };
}

// ── 2b. Keying ──────────────────────────────────────────────────────────────

/**
 * Chroma-key a green background, everywhere in the image (so holes enclosed by
 * the subject, like between a bird's wings or train windows, are cleared too).
 * Writes alpha in place.
 */
export function keyGreen(img, bg) {
  const { data } = img;
  const D = Math.max(40, bg[1] - Math.max(bg[0], bg[2])); // the background's own greenness
  for (let i = 0; i < data.length; i += 4) {
    const t = (data[i + 1] - Math.max(data[i], data[i + 2])) / D;
    let a = t >= GREEN_HI ? 0 : t <= GREEN_LO ? 255 : (255 * (GREEN_HI - t)) / (GREEN_HI - GREEN_LO);
    data[i + 3] = Math.min(data[i + 3], Math.round(a));
  }
}

/**
 * Key a flat non-green background (white, grey, any uniform colour, or both
 * colours of a drawn checkerboard). Unlike green this is a flood fill from the
 * border: white is a common colour INSIDE the subject (clock face, shirt), so
 * only background connected to the edge is removed. Edge pixels get partial
 * alpha and are "un-mixed" from the background colour.
 */
export function keyFlood(img, colours, noise = 0) {
  const { data, width: w, height: h } = img;
  const t0 = Math.max(18, 3 * noise); // closer than this: pure background
  const t1 = t0 + 45; // further than this: pure subject
  const n = w * h;
  const near = new Float32Array(n);
  const nearest = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    let best = Infinity;
    colours.forEach((c, k) => { const d = dist(data[i], data[i + 1], data[i + 2], c); if (d < best) { best = d; nearest[p] = k; } });
    near[p] = best;
  }
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  const push = (p) => { if (!seen[p] && near[p] < t1) { seen[p] = 1; queue[tail++] = p; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const y = (p - x) / w;
    // Spread only through pixels that are clearly background, so the fill
    // stops at the soft edge instead of leaking into a pale subject.
    if (near[p] < t0 + (t1 - t0) / 2) {
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (y > 0) push(p - w);
      if (y < h - 1) push(p + w);
    }
  }
  for (let p = 0; p < n; p++) {
    if (!seen[p]) continue;
    const i = p * 4;
    const a = near[p] <= t0 ? 0 : (near[p] - t0) / (t1 - t0);
    data[i + 3] = Math.min(data[i + 3], Math.round(255 * a));
    // Un-mix: observed = a*subject + (1-a)*background, solve for subject.
    if (a >= 0.25 && a < 1) {
      const c = colours[nearest[p]];
      for (let k = 0; k < 3; k++) data[i + k] = clamp255((data[i + k] - (1 - a) * c[k]) / a);
    }
  }
}

/**
 * Remove the green fringe: near the cut edge, a pixel's green may not exceed
 * max(red, blue). Applied only within 2 px of transparency so that genuinely
 * green paint inside the subject keeps its colour.
 */
export function despill(img) {
  const { data, width: w, height: h } = img;
  const n = w * h;
  let edge = new Uint8Array(n);
  for (let p = 0; p < n; p++) edge[p] = data[p * 4 + 3] < 255 ? 1 : 0;
  for (let pass = 0; pass < 2; pass++) {
    const next = edge.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (edge[p]) continue;
      if ((x > 0 && edge[p - 1]) || (x < w - 1 && edge[p + 1]) || (y > 0 && edge[p - w]) || (y < h - 1 && edge[p + w])) next[p] = 1;
    }
    edge = next;
  }
  for (let p = 0; p < n; p++) {
    if (!edge[p]) continue;
    const i = p * 4;
    const cap = Math.max(data[i], data[i + 2]);
    if (data[i + 1] > cap) data[i + 1] = cap;
  }
}

/** Drop opaque islands smaller than SPECK_SHARE of the area. Returns count removed. */
export function removeSpecks(img, share = SPECK_SHARE) {
  const { data, width: w, height: h } = img;
  const n = w * h;
  const minSize = Math.max(1, Math.round(n * share));
  const label = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  let removed = 0;
  for (let s = 0; s < n; s++) {
    if (label[s] !== -1 || data[s * 4 + 3] === 0) continue;
    // Collect one 8-connected component of non-transparent pixels.
    const members = [];
    let top = 0;
    stack[top++] = s;
    label[s] = s;
    while (top) {
      const p = stack[--top];
      members.push(p);
      const x = p % w, y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (label[q] === -1 && data[q * 4 + 3] > 0) { label[q] = s; stack[top++] = q; }
      }
    }
    if (members.length < minSize) { for (const p of members) data[p * 4 + 3] = 0; removed++; }
  }
  return removed;
}

/**
 * Background removal for one image. Mutates `img`. Returns
 * { method: string, warnings: [...] }.
 */
export function removeBackground(img) {
  const warnings = [];
  if (hasRealAlpha(img)) return { method: 'already transparent, kept as is', warnings };

  const bg = analyseBorder(img);
  let method;
  if (bg.kind === 'green') {
    keyGreen(img, bg.colours[0]);
    despill(img);
    method = `green keyed (${hex(bg.colours[0])}) + de-spill`;
  } else if (bg.kind === 'uniform') {
    keyFlood(img, bg.colours);
    method = `plain ${hex(bg.colours[0])} background keyed from the edges`;
    warnings.push(`note: background is not green but a flat ${hex(bg.colours[0])}; keyed from the edges (inner areas of that colour are kept)`);
  } else if (bg.kind === 'checker') {
    keyFlood(img, bg.colours);
    method = `fake checkerboard ${hex(bg.colours[0])}/${hex(bg.colours[1])} keyed (best effort)`;
    warnings.push('WARNING: this image has a FAKE checkerboard drawn in as its background. Please regenerate it in Gemini on a flat pure green (#00FF00) background. A best-effort cut was made, but expect ragged edges.');
  } else if (bg.colours.length) {
    keyFlood(img, bg.colours);
    method = `mixed border, dominant ${hex(bg.colours[0])} keyed from the edges (best effort)`;
    warnings.push(`WARNING: the border is not one flat colour (${Math.round(bg.coverage * 100)}% ${hex(bg.colours[0])}); cut may be poor. Regenerate on pure green (#00FF00).`);
  } else {
    method = 'NOT keyed (no clean background found)';
    warnings.push('WARNING: could not find a flat background colour on the border; the image is left opaque. Regenerate on pure green (#00FF00).');
  }
  const specks = removeSpecks(img);
  if (specks) method += `, ${specks} speck${specks > 1 ? 's' : ''} removed`;
  return { method, warnings, kind: bg.kind };
}

// ── 3. Splitting two-drawing images ─────────────────────────────────────────

/** Count of visible pixels per column (axis 'x') or per row (axis 'y'). */
function profile(img, axis) {
  const { data, width: w, height: h } = img;
  const out = new Uint32Array(axis === 'x' ? w : h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 16) out[axis === 'x' ? x : y]++;
  return out;
}

/** Widest run of empty columns/rows in the middle half, with content on both sides. */
function widestGap(prof) {
  const len = prof.length;
  const lo = Math.floor(len * 0.25), hi = Math.ceil(len * 0.75);
  let best = null;
  let start = -1;
  for (let i = lo; i <= hi; i++) {
    const empty = i < hi && prof[i] === 0;
    if (empty && start === -1) start = i;
    if (!empty && start !== -1) {
      if (!best || i - start > best.width) best = { start, end: i, width: i - start };
      start = -1;
    }
  }
  if (!best) return null;
  // A clean gap must actually separate two drawings.
  let before = 0, after = 0;
  for (let i = 0; i < best.start; i++) before += prof[i];
  for (let i = best.end; i < len; i++) after += prof[i];
  if (!before || !after) return null;
  return { ...best, at: Math.round((best.start + best.end) / 2) };
}

/**
 * Decide where to cut a two-drawing image. Returns
 * { axis: 'x' (side by side) | 'y' (stacked), at, clean, gap }.
 * `prefer` is the fallback axis when no clean gap exists.
 */
export function findSplit(img, prefer) {
  const gx = widestGap(profile(img, 'x'));
  const gy = widestGap(profile(img, 'y'));
  const minGap = (len) => Math.max(2, Math.round(len * 0.005));
  const okX = gx && gx.width >= minGap(img.width) ? gx : null;
  const okY = gy && gy.width >= minGap(img.height) ? gy : null;
  if (okX && okY) {
    // Both work: take the relatively wider gap.
    return okX.width / img.width >= okY.width / img.height
      ? { axis: 'x', at: okX.at, clean: true, gap: okX.width }
      : { axis: 'y', at: okY.at, clean: true, gap: okY.width };
  }
  if (okX) return { axis: 'x', at: okX.at, clean: true, gap: okX.width };
  if (okY) return { axis: 'y', at: okY.at, clean: true, gap: okY.width };
  const axis = prefer ?? (img.width >= img.height ? 'x' : 'y');
  return { axis, at: Math.round((axis === 'x' ? img.width : img.height) / 2), clean: false, gap: 0 };
}

/** Copy a rectangle out of an image (pixels outside the source stay transparent). */
export function crop(img, x0, y0, w, h) {
  const out = makeImage(w, h);
  for (let y = 0; y < h; y++) {
    const sy = y + y0;
    if (sy < 0 || sy >= img.height) continue;
    for (let x = 0; x < w; x++) {
      const sx = x + x0;
      if (sx < 0 || sx >= img.width) continue;
      const si = (sy * img.width + sx) * 4, di = (y * w + x) * 4;
      out.data[di] = img.data[si]; out.data[di + 1] = img.data[si + 1]; out.data[di + 2] = img.data[si + 2]; out.data[di + 3] = img.data[si + 3];
    }
  }
  return out;
}

export function splitImage(img, split) {
  const { axis, at } = split;
  return axis === 'x'
    ? [crop(img, 0, 0, at, img.height), crop(img, at, 0, img.width - at, img.height)]
    : [crop(img, 0, 0, img.width, at), crop(img, 0, at, img.width, img.height - at)];
}

// ── 4. Trim and align ───────────────────────────────────────────────────────

/** Crop to the visible bounding box plus a small transparent margin. */
export function trim(img, margin = TRIM_MARGIN) {
  const { data, width: w, height: h } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return img; // nothing visible; leave it for the report to flag
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const m = Math.round(Math.max(bw, bh) * margin);
  return crop(img, x0 - m, y0 - m, bw + 2 * m, bh + 2 * m);
}

/**
 * Put every drawing on one shared canvas, standing on the bottom edge and
 * centred horizontally, so swapping drawings never makes the piece jump.
 */
export function alignBottomCentre(imgs) {
  const W = Math.max(...imgs.map((i) => i.width));
  const H = Math.max(...imgs.map((i) => i.height));
  return imgs.map((i) => crop(i, -Math.floor((W - i.width) / 2), -(H - i.height), W, H));
}

// ── 5/6. Resize and export ──────────────────────────────────────────────────

export function targetSize(id, w, h) {
  const max = MAX_SIDE[id] ?? DEFAULT_MAX_SIDE;
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

/** Encode an image as WebP. Returns a Buffer. */
export async function encode(img, size, { opaque = false } = {}) {
  // Zero the colour of fully transparent pixels: invisible, but it compresses better.
  if (!opaque) for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3] === 0) img.data[i] = img.data[i + 1] = img.data[i + 2] = 0;
  let pipe = sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.width, height: img.height, channels: 4 } });
  if (size.w !== img.width || size.h !== img.height) pipe = pipe.resize(size.w, size.h, { fit: 'fill', kernel: 'lanczos3' });
  return opaque ? pipe.removeAlpha().webp(WEBP_SKY).toBuffer() : pipe.webp(WEBP_ALPHA).toBuffer();
}

// ── Per-piece processing ────────────────────────────────────────────────────

/**
 * Process one piece. Returns { id, outputs: [{ name, buffer }], entry, lines, warnings }.
 * `entry` is the manifest entry (without doorAt; the caller adds that).
 */
export async function processPiece(id, source, piece = PIECES[id]) {
  const warnings = [];
  const lines = [];
  const outputs = [];

  if (piece.fit === 'cover') {
    // Full-frame backdrop: no keying, no trimming, just resize and encode.
    const variants = {};
    let w, h;
    for (const [variant, file] of Object.entries(source.variants ?? { [piece.variants?.[0] ?? 'wide']: source.file })) {
      const img = await loadImage(file);
      const size = targetSize(id, img.width, img.height);
      const name = `${id}-${variant}.webp`;
      const buffer = await encode(img, size, { opaque: true });
      outputs.push({ name, buffer });
      variants[variant] = name;
      if (variant === 'wide' || w === undefined) ({ w, h } = size);
      lines.push(`${basename(file)} ${img.width}x${img.height} -> ${name} ${size.w}x${size.h}, ${kb(buffer)} (full frame, not keyed)`);
    }
    return { id, outputs, entry: { variants, w, h }, lines, warnings };
  }

  const img = await loadImage(source.file);
  const srcSize = `${img.width}x${img.height}`;
  const bg = removeBackground(img);
  warnings.push(...bg.warnings);
  lines.push(`${basename(source.file)} ${srcSize}, background: ${bg.method}`);

  let drawings = [img];
  if (piece.states === 2) {
    // The train is drawn stacked (two long trains); others side by side.
    const split = findSplit(img, id === 'train' ? 'y' : undefined);
    drawings = splitImage(img, split);
    const dir = split.axis === 'x' ? 'side by side' : 'stacked';
    if (split.clean) lines.push(`split ${dir} at ${split.axis}=${split.at} (clean gap ${split.gap}px)`);
    else {
      lines.push(`split ${dir} at the middle, ${split.axis}=${split.at}`);
      warnings.push(`no clean transparent gap between the two drawings; cut at the exact middle (${dir}). Check the results, or regenerate with more space between them.`);
    }
  } else if (piece.states > 2) {
    warnings.push(`${piece.states} states are not supported by the splitter; exported as one image`);
  }

  drawings = alignBottomCentre(drawings.map((d) => trim(d)));
  const W = drawings[0].width, H = drawings[0].height;
  const size = targetSize(id, W, H);
  const names = drawings.length === 1 ? [`${id}.webp`] : drawings.map((_, k) => `${id}-${'ab'[k]}.webp`);
  for (let k = 0; k < drawings.length; k++) {
    const buffer = await encode(drawings[k], size);
    outputs.push({ name: names[k], buffer });
  }
  lines.push(`-> ${names.join(' + ')} ${size.w}x${size.h}, ${outputs.map((o) => kb(o.buffer)).join(' + ')}`);
  return { id, outputs, entry: { states: names, w: size.w, h: size.h }, lines, warnings };
}

const kb = (buf) => `${Math.round(buf.length / 1024)} KB`;

// ── 7. Manifest ─────────────────────────────────────────────────────────────

export function readManifest(file) {
  if (!existsSync(file)) return { version: 1, pieces: {} };
  try {
    const m = JSON.parse(readFileSync(file, 'utf8'));
    return { version: 1, pieces: m.pieces ?? {} };
  } catch {
    return { version: 1, pieces: {} };
  }
}

/**
 * Merge freshly processed entries into an existing manifest. Entries for
 * pieces not processed this run are kept. Returns { manifest, notes }.
 */
export function mergeManifest(existing, entries, { door } = {}, pieces = PIECES) {
  const notes = [];
  const merged = { ...existing.pieces };
  for (const [id, entry] of Object.entries(entries)) {
    if (entry.variants && merged[id]?.variants) {
      // Keep a variant that was not regenerated this run (e.g. only the wide sky).
      const variants = { ...merged[id].variants, ...entry.variants };
      merged[id] = entry.variants.wide ? { ...entry, variants } : { ...merged[id], variants };
    } else merged[id] = entry;
  }
  if (merged.train) {
    merged.train = { ...merged.train }; // don't mutate the caller's objects
    const old = existing.pieces.train?.doorAt;
    if (door !== undefined) merged.train.doorAt = door;
    else if (old !== undefined) merged.train.doorAt = old;
    else {
      merged.train.doorAt = 0.5;
      notes.push('reminder: train doorAt is a placeholder 0.5. Measure the door centre in train-b.webp (fraction of width) and re-run with --door=0.47 (for example).');
    }
  } else if (door !== undefined) notes.push('--door given but there is no train in the manifest yet; ignored');
  // Stable order: as listed in stage.js, then anything unknown at the end.
  const ordered = {};
  for (const id of Object.keys(pieces)) if (merged[id]) ordered[id] = merged[id];
  for (const id of Object.keys(merged)) if (!ordered[id]) ordered[id] = merged[id];
  return { manifest: { version: 1, pieces: ordered }, notes };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const opts = { source: null, out: DEFAULT_OUT, only: null, door: undefined, dryRun: false };
  for (const a of argv) {
    if (a === '--dry-run') opts.dryRun = true;
    else if (a.startsWith('--out=')) opts.out = resolve(a.slice(6));
    else if (a.startsWith('--only=')) opts.only = a.slice(7).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--door=')) {
      const d = Number(a.slice(7));
      if (!(d > 0 && d < 1)) throw new Error(`--door must be a number between 0 and 1, got "${a.slice(7)}"`);
      opts.door = d;
    } else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else opts.source = resolve(a);
  }
  if (!opts.source) throw new Error('usage: node scripts/cutout.mjs <sourceDir> [--out=dir] [--only=birds,train] [--door=0.47] [--dry-run]');
  if (opts.only) for (const id of opts.only) if (!PIECES[id]) throw new Error(`--only: unknown piece "${id}"`);
  return opts;
}

/**
 * Run the whole pipeline. Returns { ok, results, warnings, errors, manifest }.
 * `log` receives the human-readable report lines.
 */
export async function run(argv, { log = console.log, pieces = PIECES } = {}) {
  const opts = parseArgs(argv);
  const { sources, warnings } = findSources(opts.source, pieces, opts.only);
  for (const w of warnings) log(`! ${w}`);

  const results = [];
  const errors = [];
  for (const id of Object.keys(pieces)) {
    if (!sources[id]) continue;
    try {
      const r = await processPiece(id, sources[id], pieces[id]);
      results.push(r);
      log(`\n${id}`);
      for (const l of r.lines) log(`  ${l}`);
      for (const w of r.warnings) log(`  ! ${w}`);
    } catch (err) {
      errors.push({ id, error: err });
      log(`\n${id}\n  ERROR: could not process ${JSON.stringify(sources[id])}: ${err.message}`);
    }
  }

  const manifestFile = join(opts.out, 'manifest.json');
  const entries = Object.fromEntries(results.map((r) => [r.id, r.entry]));
  const { manifest, notes } = mergeManifest(readManifest(manifestFile), entries, { door: opts.door }, pieces);
  for (const n of notes) log(`\n! ${n}`);

  if (opts.dryRun) log('\n(dry run: nothing written)');
  else {
    mkdirSync(opts.out, { recursive: true });
    for (const r of results) for (const o of r.outputs) writeFileSync(join(opts.out, o.name), o.buffer);
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    log(`\nwrote ${results.reduce((n, r) => n + r.outputs.length, 0)} file(s) and manifest.json to ${opts.out}`);
  }
  return { ok: errors.length === 0, results, warnings: [...warnings, ...results.flatMap((r) => r.warnings), ...notes], errors, manifest };
}

// Run as a script (not when imported by the tests).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  run(process.argv.slice(2))
    .then((r) => { if (!r.ok) process.exitCode = 1; })
    .catch((err) => { console.error(err.message); process.exitCode = 1; });
}

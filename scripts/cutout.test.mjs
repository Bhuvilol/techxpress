// Tests for the cutout pipeline. Synthetic images are drawn with sharp into a
// temp folder, run through the exported pipeline functions, and the output
// pixels are checked. Run: npm run test:cutout

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  run,
  processPiece,
  removeBackground,
  analyseBorder,
  loadImage,
  mergeManifest,
  findSources,
} from './cutout.mjs';

let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'cutout-test-')); });
after(() => { rmSync(dir, { recursive: true, force: true }); });

// ── Drawing helpers ─────────────────────────────────────────────────────────

/** Raw RGBA canvas filled with one colour. */
function canvas(w, h, [r, g, b, a = 255]) {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a; }
  return { data, w, h };
}

function rect(c, x0, y0, rw, rh, [r, g, b, a = 255]) {
  for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) {
    const i = (y * c.w + x) * 4;
    c.data[i] = r; c.data[i + 1] = g; c.data[i + 2] = b; c.data[i + 3] = a;
  }
}

/** Save a canvas as PNG. A slight blur gives soft, anti-aliased edges like real art. */
async function save(c, name, { blur = true } = {}) {
  const file = join(dir, name);
  let p = sharp(c.data, { raw: { width: c.w, height: c.h, channels: 4 } });
  if (blur) p = p.blur(1);
  await p.png().toFile(file);
  return file;
}

async function decode(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const i = (y * info.width + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
  return { data, w: info.width, h: info.height, px };
}

/** Bounding boxes of visible blobs, by scanning columns: returns count of separate x-runs. */
function visibleColumnRuns(img) {
  let runs = 0, inRun = false;
  for (let x = 0; x < img.w; x++) {
    let any = false;
    for (let y = 0; y < img.h; y++) if (img.data[(y * img.w + x) * 4 + 3] > 128) { any = true; break; }
    if (any && !inRun) runs++;
    inRun = any;
  }
  return runs;
}

const GREEN = [0, 255, 0];
const RED = [220, 30, 30];
const BLUE = [30, 60, 200];

// ── Tests ───────────────────────────────────────────────────────────────────

test('green background is keyed and de-spilled', async () => {
  const c = canvas(400, 300, GREEN);
  rect(c, 100, 80, 200, 140, RED);
  const file = await save(c, '01-sun.png');
  const r = await processPiece('sun', { file });
  assert.match(r.lines[0], /green keyed/);
  const out = await decode(r.outputs[0].buffer);
  // Trimmed: roughly the rectangle plus a 2 % margin.
  assert.ok(out.w < 230 && out.w > 200, `width ${out.w}`);
  assert.equal(out.px(0, 0)[3], 0, 'top-left corner transparent');
  assert.equal(out.px(out.w - 1, out.h - 1)[3], 0, 'bottom-right corner transparent');
  const centre = out.px(out.w >> 1, out.h >> 1);
  assert.equal(centre[3], 255, 'centre opaque');
  assert.ok(centre[0] > 180 && centre[1] < 80, `centre stays red ${centre}`);
  // No visible pixel anywhere may be noticeably green-dominant (no fringe).
  let worst = -255;
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const [r_, g, b, a] = out.px(x, y);
    if (a > 0) worst = Math.max(worst, g - Math.max(r_, b));
  }
  assert.ok(worst <= 12, `green fringe remains: max g-max(r,b) = ${worst}`);
});

test('off-shade green (real Gemini output) is detected and keyed', async () => {
  const c = canvas(300, 300, [40, 200, 70]);
  rect(c, 100, 100, 100, 100, BLUE);
  const img = await loadImage(await save(c, 'offgreen.png'));
  assert.equal(analyseBorder(img).kind, 'green');
  removeBackground(img);
  assert.equal(img.data[3], 0);
  assert.equal(img.data[(150 * 300 + 150) * 4 + 3], 255);
});

test('an image that already has real alpha is kept as is', async () => {
  const c = canvas(300, 200, [0, 0, 0, 0]);
  // A green subject on transparency: keying would destroy it, so it must be left alone.
  rect(c, 50, 50, 200, 100, [20, 230, 20, 255]);
  const file = await save(c, '02-clock.png', { blur: false });
  const r = await processPiece('clock', { file });
  assert.match(r.lines[0], /already transparent/);
  const out = await decode(r.outputs[0].buffer);
  const centre = out.px(out.w >> 1, out.h >> 1);
  assert.equal(centre[3], 255);
  assert.ok(centre[1] > 200, 'green subject untouched');
});

test('two-state image side by side splits into two equal-size states, one shape each', async () => {
  const c = canvas(800, 300, GREEN);
  rect(c, 80, 60, 220, 180, RED);
  rect(c, 500, 60, 220, 180, BLUE);
  const file = await save(c, '03-birds.png');
  const r = await processPiece('birds', { file });
  assert.deepEqual(r.entry.states, ['birds-a.webp', 'birds-b.webp']);
  assert.match(r.lines.join('\n'), /side by side/);
  assert.equal(r.warnings.length, 0, r.warnings.join('; '));
  const [a, b] = await Promise.all(r.outputs.map((o) => decode(o.buffer)));
  assert.equal(a.w, b.w);
  assert.equal(a.h, b.h);
  assert.equal(visibleColumnRuns(a), 1);
  assert.equal(visibleColumnRuns(b), 1);
  const ca = a.px(a.w >> 1, a.h >> 1), cb = b.px(b.w >> 1, b.h >> 1);
  assert.ok(ca[0] > 180 && ca[2] < 80, 'state A is the red shape');
  assert.ok(cb[2] > 150 && cb[0] < 80, 'state B is the blue shape');
});

test('two-state image stacked (train) splits horizontally', async () => {
  const c = canvas(900, 500, GREEN);
  rect(c, 50, 40, 800, 160, RED);
  rect(c, 50, 300, 800, 160, BLUE);
  const file = await save(c, '06-train.png');
  const r = await processPiece('train', { file });
  assert.match(r.lines.join('\n'), /stacked/);
  const [a, b] = await Promise.all(r.outputs.map((o) => decode(o.buffer)));
  assert.equal(a.w, b.w);
  assert.equal(a.h, b.h);
  assert.ok(a.w > a.h * 3, 'each state is one long train, not half of both');
  assert.ok(a.px(a.w >> 1, a.h >> 1)[0] > 180);
  assert.ok(b.px(b.w >> 1, b.h >> 1)[2] > 150);
});

test('no clean gap: split at the middle and warn', async () => {
  const c = canvas(600, 200, GREEN);
  rect(c, 50, 50, 500, 100, RED); // one shape spanning the middle
  const file = await save(c, '09-chai.png');
  const r = await processPiece('chai', { file });
  assert.equal(r.outputs.length, 2);
  assert.ok(r.warnings.some((w) => /no clean transparent gap/.test(w)));
});

test('drawings of different heights are aligned bottom-centre', async () => {
  const c = canvas(800, 400, GREEN);
  rect(c, 100, 60, 200, 300, RED); // tall: y 60..360
  rect(c, 520, 210, 120, 150, BLUE); // short and narrow, same baseline: y 210..360
  const file = await save(c, '10-rajesh.png');
  const r = await processPiece('rajesh', { file });
  const [a, b] = await Promise.all(r.outputs.map((o) => decode(o.buffer)));
  assert.equal(a.w, b.w);
  assert.equal(a.h, b.h);
  // Visible extents of the short drawing inside the shared canvas.
  let top = b.h, bottom = -1, left = b.w, right = -1;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (b.px(x, y)[3] > 128) {
    top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
  }
  let aBottom = -1;
  for (let y = 0; y < a.h; y++) if (a.px(a.w >> 1, y)[3] > 128) aBottom = y;
  assert.ok(Math.abs(bottom - aBottom) <= 4, `bottoms line up (${bottom} vs ${aBottom})`);
  assert.ok(top > b.h * 0.4, 'short drawing sits low, empty space above');
  const centre = (left + right) / 2;
  assert.ok(Math.abs(centre - b.w / 2) <= 3, `horizontally centred (${centre} vs ${b.w / 2})`);
});

test('a fake checkerboard background is detected and warned about', async () => {
  const c = canvas(320, 320, [255, 255, 255]);
  for (let y = 0; y < 320; y += 16) for (let x = 0; x < 320; x += 16) if (((x + y) / 16) % 2) rect(c, x, y, 16, 16, [204, 204, 204]);
  rect(c, 100, 100, 120, 120, RED);
  const file = await save(c, '11-kiosk.png', { blur: false });
  const img = await loadImage(file);
  assert.equal(analyseBorder(img).kind, 'checker');
  const r = await processPiece('kiosk', { file });
  assert.ok(r.warnings.some((w) => /checkerboard/i.test(w) && /regenerate/i.test(w)), r.warnings.join('; '));
  const out = await decode(r.outputs[0].buffer);
  assert.equal(out.px(0, 0)[3], 0, 'checker keyed at the corner');
  assert.equal(out.px(out.w >> 1, out.h >> 1)[3], 255);
});

test('plain white background is keyed from the edges with a note', async () => {
  const c = canvas(300, 300, [252, 252, 250]);
  rect(c, 60, 60, 180, 180, BLUE);
  rect(c, 120, 120, 60, 60, [252, 252, 250]); // white inside the subject must stay
  const file = await save(c, '12-nameboard.png');
  const r = await processPiece('nameboard', { file });
  assert.ok(r.warnings.some((w) => /not green/.test(w)));
  const out = await decode(r.outputs[0].buffer);
  assert.equal(out.px(0, 0)[3], 0);
  assert.equal(out.px(out.w >> 1, out.h >> 1)[3], 255, 'enclosed white kept');
});

test('sky (fit: cover) is not keyed and keeps its full frame', async () => {
  const c = canvas(640, 360, GREEN); // even an all-green sky must not be cut out
  rect(c, 0, 0, 640, 180, [120, 180, 240]);
  const file = await save(c, '01-sky-wide.png');
  const r = await processPiece('sky', { variants: { wide: file } });
  assert.deepEqual(r.entry, { variants: { wide: 'sky-wide.webp' }, w: 640, h: 360 });
  const out = await decode(r.outputs[0].buffer);
  assert.equal(out.w, 640);
  assert.equal(out.h, 360);
  assert.equal(out.px(5, 300)[3], 255, 'opaque');
  assert.ok(out.px(5, 300)[1] > 200, 'green kept');
});

test('manifest merge keeps unrelated entries and --door sets doorAt', () => {
  const existing = {
    version: 1,
    pieces: {
      clock: { states: ['clock.webp'], w: 300, h: 400 },
      train: { states: ['train-a.webp', 'train-b.webp'], w: 2000, h: 500, doorAt: 0.4 },
      sky: { variants: { wide: 'sky-wide.webp', tall: 'sky-tall.webp' }, w: 2560, h: 1440 },
    },
  };
  const fresh = { train: { states: ['train-a.webp', 'train-b.webp'], w: 2600, h: 600 }, sky: { variants: { wide: 'sky-wide.webp' }, w: 2048, h: 1152 } };

  const kept = mergeManifest(existing, fresh).manifest;
  assert.deepEqual(kept.pieces.clock, existing.pieces.clock, 'unrelated entry kept');
  assert.equal(kept.pieces.train.doorAt, 0.4, 'existing doorAt kept');
  assert.equal(kept.pieces.train.w, 2600);
  assert.deepEqual(kept.pieces.sky.variants, { wide: 'sky-wide.webp', tall: 'sky-tall.webp' }, 'tall variant kept');
  assert.equal(kept.pieces.sky.w, 2048);

  assert.equal(mergeManifest(existing, fresh, { door: 0.47 }).manifest.pieces.train.doorAt, 0.47);
  const blank = mergeManifest({ version: 1, pieces: {} }, { train: fresh.train });
  assert.equal(blank.manifest.pieces.train.doorAt, 0.5);
  assert.ok(blank.notes.some((n) => /door/.test(n)));
});

test('end to end: run() writes files and merges manifest.json', async () => {
  const src = mkdtempSync(join(dir, 'src-'));
  const out = mkdtempSync(join(dir, 'out-'));
  writeFileSync(join(out, 'manifest.json'), JSON.stringify({ version: 1, pieces: { clock: { states: ['clock.webp'], w: 1, h: 1 } } }));
  const c = canvas(800, 300, GREEN);
  rect(c, 80, 60, 220, 180, RED);
  rect(c, 500, 60, 220, 180, BLUE);
  await sharp(c.data, { raw: { width: 800, height: 300, channels: 4 } }).png().toFile(join(src, '03-birds.png'));
  writeFileSync(join(src, '99-dragon.png'), 'not really an image');

  const lines = [];
  const r = await run([src, `--out=${out}`, '--only=birds'], { log: (l) => lines.push(l) });
  assert.ok(r.ok);
  assert.ok(lines.some((l) => /unknown source name "99-dragon.png"/.test(l)));
  assert.ok(existsSync(join(out, 'birds-a.webp')) && existsSync(join(out, 'birds-b.webp')));
  const m = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
  assert.deepEqual(Object.keys(m.pieces), ['birds', 'clock']);
  assert.deepEqual(m.pieces.birds.states, ['birds-a.webp', 'birds-b.webp']);

  // An unreadable source is an error (non-zero exit in the CLI).
  writeFileSync(join(src, '05-mast.png'), 'broken');
  const bad = await run([src, `--out=${out}`, '--only=mast', '--dry-run'], { log: () => {} });
  assert.equal(bad.ok, false);
});

test('findSources warns about pieces with no source', () => {
  const src = mkdtempSync(join(dir, 'empty-'));
  const { warnings } = findSources(src, undefined, ['sun', 'sky']);
  assert.ok(warnings.some((w) => /no source image for "sun"/.test(w)));
  assert.ok(warnings.some((w) => /no source image for "sky"/.test(w)));
});

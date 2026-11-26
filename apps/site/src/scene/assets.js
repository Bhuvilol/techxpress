// Reads the cutout manifest (written by scripts/cutout.mjs) and turns file
// names into bundled URLs. A piece that is missing, or whose files are
// missing, returns null and is drawn as a placeholder card instead.

import manifest from '../assets/stage/manifest.json';

// Every image in the stage folder, bundled by Vite (hashed URLs).
const FILES = import.meta.glob('../assets/stage/*.{webp,avif,png}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const urlOf = (name) => FILES[`../assets/stage/${name}`];

// { srcs: [urlA, urlB?], w, h, doorAt? } or null.
export function artFor(id, composition) {
  const entry = manifest.pieces?.[id];
  if (!entry || !entry.w || !entry.h) return null;
  const names = entry.variants
    ? [entry.variants[composition] ?? Object.values(entry.variants)[0]]
    : entry.states ?? [];
  const srcs = names.map(urlOf);
  if (!srcs.length || srcs.some((s) => !s)) {
    console.warn(`[stage] manifest lists files for "${id}" that are not in src/assets/stage; using a placeholder`);
    return null;
  }
  return { srcs, w: entry.w, h: entry.h, doorAt: entry.doorAt };
}

// Resolves once every image has decoded (or failed), or after `timeout` ms,
// so the opening never animates empty boxes but never waits forever either.
export function preload(srcs, timeout = 4000) {
  if (!srcs.length) return Promise.resolve();
  const each = srcs.map((src) => {
    const img = new Image();
    img.src = src;
    return img.decode().catch(() => {});
  });
  return Promise.race([
    Promise.all(each),
    new Promise((resolve) => { setTimeout(resolve, timeout); }),
  ]);
}

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { journeysFor } from './journeys.js';

// The guide points at elements by selector. If someone renames a field or a
// class in the UI, the guide would quietly stop highlighting it, so check that
// every selector still has a home in the UI source.

const SRC = new URL('..', import.meta.url).pathname;
const jsx = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return jsx(full);
    return name.endsWith('.jsx') && !name.endsWith('.test.jsx') ? [readFileSync(full, 'utf8')] : [];
  });
const ui = jsx(join(SRC, 'ui')).join('\n');
const pnr = readFileSync(join(SRC, 'ui/panels/PnrStatus.jsx'), 'utf8');

// Every selector shape the journeys use, mapped to a check against the source.
const exists = (selector) => {
  let m = selector.match(/^\[data-field="([A-Za-z]+)"\]$/);
  if (m) return ui.includes(`field="${m[1]}"`);
  m = selector.match(/^#pnr-([A-Za-z]+)$/);
  if (m) return pnr.includes(`field('${m[1]}'`);
  m = selector.match(/^\.pnr-form button\[type="submit"\]$/);
  if (m) return pnr.includes('className="pnr-form"');
  m = selector.match(/^\.([A-Za-z0-9_-]+)$/);
  if (m) return ui.includes(m[1]);
  return null; // a selector shape this test does not know yet
};

const journeys = [...journeysFor(true), ...journeysFor(false)];

describe('guide journeys', () => {
  it('only use selectors the test understands', () => {
    const unknown = journeys.flatMap((j) => j.steps).filter((s) => s.target && exists(s.target) === null).map((s) => s.target);
    expect(unknown).toEqual([]);
  });

  it('point at elements that still exist in the UI', () => {
    const gone = journeys.flatMap((j) => j.steps).filter((s) => s.target && exists(s.target) === false).map((s) => s.target);
    expect(gone).toEqual([]);
  });

  it('are well formed', () => {
    for (const j of journeys) {
      expect(j.steps.length, j.id).toBeGreaterThan(0);
      for (const s of j.steps) {
        expect(['book', 'pnr', null, '*'], `${j.id} panel`).toContain(s.panel);
        expect(['next', 'input', 'click', 'pills'], `${j.id} advance`).toContain(s.advance);
        expect(s.say?.trim(), `${j.id} say`).toBeTruthy();
        if (s.advance !== 'next') expect(s.target, `${j.id}: ${s.advance} needs a target`).toBeTruthy();
        if (s.advance === 'pills') expect(s.min, `${j.id}: pills needs min`).toBeGreaterThan(0);
        if (s.optional) expect(s.target, `${j.id}: optional needs a target`).toBeTruthy();
      }
    }
  });
});

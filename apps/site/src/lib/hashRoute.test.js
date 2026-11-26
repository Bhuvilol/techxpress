import { describe, expect, it } from 'vitest';
import { PUSHED_KEY, createPanelHistory, panelFromHash, planClose, planOpen } from './hashRoute.js';

// A tiny in-memory browser history: entries of { hash, state }.
const fakeHistory = (hash = '', state = null) => {
  const entries = [{ hash, state }];
  let i = 0;
  return {
    entries,
    get index() { return i; },
    getHash: () => entries[i].hash,
    getState: () => entries[i].state,
    push(h, s) { entries.splice(i + 1); entries.push({ hash: h, state: s }); i += 1; },
    replace(h, s) { entries[i] = { hash: h, state: s }; },
    back() { if (i > 0) i -= 1; },
  };
};

describe('panelFromHash', () => {
  it('accepts known panels with or without #, any case', () => {
    expect(panelFromHash('#faq')).toBe('faq');
    expect(panelFromHash('book')).toBe('book');
    expect(panelFromHash('#PNR ')).toBe('pnr');
  });
  it('rejects unknown or empty hashes', () => {
    expect(panelFromHash('')).toBeNull();
    expect(panelFromHash('#')).toBeNull();
    expect(panelFromHash('#vortex')).toBeNull();
    expect(panelFromHash(undefined)).toBeNull();
  });
});

describe('planOpen / planClose', () => {
  it('pushes a marked entry when nothing is open', () => {
    expect(planOpen(null, 'about', null)).toEqual({ type: 'push', hash: '#about', state: { [PUSHED_KEY]: true } });
  });
  it('does nothing for the panel already open or an unknown name', () => {
    expect(planOpen('about', 'about', null).type).toBe('none');
    expect(planOpen(null, 'nope', null).type).toBe('none');
  });
  it('replaces when switching panels and keeps the marker', () => {
    expect(planOpen('book', 'pnr', { [PUSHED_KEY]: true })).toEqual({ type: 'replace', hash: '#pnr', state: { [PUSHED_KEY]: true } });
    expect(planOpen('book', 'pnr', null).state[PUSHED_KEY]).toBe(false);
  });
  it('goes back only from an entry we pushed', () => {
    expect(planClose('faq', { [PUSHED_KEY]: true }).type).toBe('back');
    expect(planClose('faq', null)).toEqual({ type: 'replace', hash: '', state: null });
    expect(planClose(null, null).type).toBe('none');
  });
});

describe('createPanelHistory', () => {
  it('open then close returns to the stage entry (back button friendly)', () => {
    const h = fakeHistory();
    const panels = createPanelHistory(h);
    expect(panels.open('timetable')).toBe('push');
    expect(panels.current()).toBe('timetable');
    expect(h.entries).toHaveLength(2);
    expect(panels.close()).toBe('back');
    expect(panels.current()).toBeNull();
    expect(h.index).toBe(0);
  });

  it('switching panels does not stack history', () => {
    const h = fakeHistory();
    const panels = createPanelHistory(h);
    panels.open('book');
    panels.open('pnr');
    expect(h.entries).toHaveLength(2);
    expect(panels.current()).toBe('pnr');
    panels.close();
    expect(h.index).toBe(0);
    expect(panels.current()).toBeNull();
  });

  it('a deep link (/#faq) closes by replacing, never leaving the site', () => {
    const h = fakeHistory('#faq', null);
    const panels = createPanelHistory(h);
    expect(panels.current()).toBe('faq');
    expect(panels.close()).toBe('replace');
    expect(h.entries).toEqual([{ hash: '', state: null }]);
  });
});

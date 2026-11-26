import { describe, expect, it } from 'vitest';
import { countdownParts, countdownSpoken, ledStatusKey, shutterKey, startOfIstDay, timeLeft } from './countdown.js';

const EVENT = {
  startsAt: '2026-12-04T09:30:00+05:30',
  opensOn: '2026-11-27',
  closesOn: '2026-12-01',
};
const at = (iso) => new Date(iso);

describe('timeLeft', () => {
  it('splits the gap into days, hours and minutes', () => {
    const left = timeLeft(at('2026-11-26T08:00:00+05:30'), EVENT.startsAt);
    expect(left).toMatchObject({ days: 8, hours: 1, minutes: 30 });
  });
  it('never goes negative', () => {
    expect(timeLeft(at('2026-12-05T00:00:00+05:30'), EVENT.startsAt)).toEqual({ total: 0, days: 0, hours: 0, minutes: 0 });
  });
  it('formats for the board and for screen readers', () => {
    const left = { days: 1, hours: 2, minutes: 9 };
    expect(countdownParts(left)).toEqual([['01', 'D'], ['02', 'H'], ['09', 'M']]);
    expect(countdownSpoken(left)).toBe('1 day, 2 hours and 9 minutes');
  });
});

describe('ledStatusKey', () => {
  const s = (iso, open) => ledStatusKey({ now: at(iso), open, ...EVENT });

  it('opening day starts at midnight India time', () => {
    expect(startOfIstDay('2026-11-27')).toBe(Date.parse('2026-11-26T18:30:00Z'));
  });
  it('closed before the opening day -> beforeOpen', () => {
    expect(s('2026-11-26T23:59:00+05:30', false)).toBe('beforeOpen');
  });
  it('open -> open, whatever the date', () => {
    expect(s('2026-11-26T12:00:00+05:30', true)).toBe('open');
    expect(s('2026-11-28T12:00:00+05:30', true)).toBe('open');
  });
  it('closed after the opening day -> closed', () => {
    expect(s('2026-11-27T00:00:00+05:30', false)).toBe('closed');
    expect(s('2026-12-02T10:00:00+05:30', false)).toBe('closed');
  });
  it('after the start -> departed, even if still open', () => {
    expect(s('2026-12-04T09:30:00+05:30', true)).toBe('departed');
    expect(s('2026-12-04T10:00:00+05:30', null)).toBe('departed');
  });
  it('unknown status falls back to the published dates', () => {
    expect(s('2026-11-20T10:00:00+05:30', null)).toBe('beforeOpen');
    expect(s('2026-11-29T10:00:00+05:30', null)).toBe('open');
    expect(s('2026-12-01T23:00:00+05:30', null)).toBe('open');
    expect(s('2026-12-02T00:00:00+05:30', null)).toBe('closed');
  });
});

describe('shutterKey', () => {
  it('picks the before / after line by the opening day', () => {
    expect(shutterKey({ now: at('2026-11-26T10:00:00+05:30'), opensOn: EVENT.opensOn })).toBe('closedBefore');
    expect(shutterKey({ now: at('2026-12-02T10:00:00+05:30'), opensOn: EVENT.opensOn })).toBe('closedAfter');
  });
});

import { describe, expect, it } from 'vitest';
import { fitText, formatBerth, formatJourneyDate, ticketFields, ticketFileName, truncateToWidth } from './eticket.js';

// Fake monospace metrics: every character is 10 px at size 20.
const measure = (s) => s.length * 10;
const measureAt = (size, s) => s.length * size * 0.5;

describe('truncateToWidth', () => {
  it('keeps text that fits', () => {
    expect(truncateToWidth('ANANYA', 100, measure)).toBe('ANANYA');
  });
  it('cuts at a word boundary with an ellipsis', () => {
    const out = truncateToWidth('SUBHASHREE PRIYADARSHINI MOHAPATRA', 250, measure);
    expect(out).toBe('SUBHASHREE PRIYADARSHINI…');
    expect(measure(out)).toBeLessThanOrEqual(250);
  });
  it('cuts mid-word when the first word alone is too long', () => {
    const out = truncateToWidth('VENKATARAGHAVANSUBRAMANIAM', 120, measure);
    expect(out).toBe('VENKATARAGH…');
    expect(measure(out)).toBeLessThanOrEqual(120);
  });
  it('collapses whitespace and drops trailing punctuation before the ellipsis', () => {
    expect(truncateToWidth('  Institute   of Technical Education, and Research ', 360, measure)).toBe('Institute of Technical Education…');
  });
  it('degrades to just an ellipsis in a tiny box', () => {
    expect(truncateToWidth('ABC DEF', 10, measure)).toBe('…');
    expect(truncateToWidth('ABC DEF', 5, measure)).toBe('');
  });
});

describe('fitText', () => {
  it('uses the biggest size that fits', () => {
    expect(fitText('ABCDEFGHIJ', { maxWidth: 200, maxSize: 60, minSize: 20, measureAt })).toEqual({ size: 40, text: 'ABCDEFGHIJ' });
  });
  it('truncates at the minimum size', () => {
    const r = fitText('A VERY LONG PASSENGER NAME INDEED', { maxWidth: 100, maxSize: 40, minSize: 20, measureAt });
    expect(r.size).toBe(20);
    expect(r.text.endsWith('…')).toBe(true);
    expect(measureAt(20, r.text)).toBeLessThanOrEqual(100);
  });
});

describe('field formatting', () => {
  it('formats journey dates railway style', () => {
    expect(formatJourneyDate('2026-12-04')).toBe('04 DEC 2026');
    expect(formatJourneyDate('2026-12-04T09:30:00+05:30')).toBe('04 DEC 2026');
    expect(formatJourneyDate('Fri 4 Dec')).toBe('FRI 4 DEC');
    expect(formatJourneyDate('')).toBe('04 DEC 2026');
  });
  it('joins coach, berth and type, skipping blanks', () => {
    expect(formatBerth({ coach: 'c2', berth: 34, berthType: 'lower' })).toBe('C2 / 34 / LOWER');
    expect(formatBerth({ coach: 'B1' })).toBe('B1');
    expect(formatBerth({})).toBe('—');
  });
  it('makes a safe file name', () => {
    expect(ticketFileName('TXP-AB12')).toBe('techxpress-ticket-TXP-AB12.png');
    expect(ticketFileName('../x y')).toBe('techxpress-ticket-x-y.png');
    expect(ticketFileName()).toBe('techxpress-ticket-ticket.png');
  });
  it('fills every ticket field with a printable value', () => {
    const f = ticketFields({ pnr: 'txp-1', name: ' ananya  das ', institution: 'ITER', domain: 'AI', coach: 'C1', berth: 7, berthType: 'Window' });
    expect(f).toMatchObject({ pnr: 'TXP-1', name: 'ANANYA DAS', train: '12026 TECHXPRESS', date: '04 DEC 2026', berth: 'C1 / 7 / WINDOW', berthType: 'WINDOW' });
    expect(ticketFields({}).name).toBe('—');
  });
});

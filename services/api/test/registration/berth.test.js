import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seatToBerth } from '../../src/utils/berth.js';

test('seats fill coaches in order, 72 berths each', () => {
  assert.deepEqual(seatToBerth(1), { coach: 'TX-01', berth: '1', berthType: 'LB' });
  assert.deepEqual(seatToBerth(8), { coach: 'TX-01', berth: '8', berthType: 'SU' });
  assert.deepEqual(seatToBerth(72), { coach: 'TX-01', berth: '72', berthType: 'SU' });
  assert.deepEqual(seatToBerth(73), { coach: 'TX-02', berth: '1', berthType: 'LB' });
  assert.deepEqual(seatToBerth(865), { coach: 'TX-13', berth: '1', berthType: 'LB' });
});

test('different seat numbers never give the same coach and berth', () => {
  const seen = new Set();
  for (let n = 1; n <= 2000; n += 1) {
    const { coach, berth } = seatToBerth(n);
    const key = `${coach}/${berth}`;
    assert.equal(seen.has(key), false, `seat ${n} clashes`);
    seen.add(key);
  }
});

test('no seat yet gives blanks, not a made-up seat', () => {
  for (const v of [null, undefined, 0, -1, 1.5]) {
    assert.deepEqual(seatToBerth(v), { coach: null, berth: null, berthType: null });
  }
});

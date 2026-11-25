import { test } from 'node:test';
import assert from 'node:assert/strict';
import { berthFor } from '../../src/utils/berth.js';

test('the same user always gets the same coach and berth', () => {
  assert.deepEqual(berthFor('cabc123'), berthFor('cabc123'));
});

test('coach, berth and berth type are always in range and consistent', () => {
  const types = ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'];
  for (let i = 0; i < 2000; i += 1) {
    const { coach, berth, berthType } = berthFor(`cuser${i}`);
    assert.match(coach, /^TX-(0[1-9]|1[0-2])$/);
    const n = Number(berth);
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 72);
    assert.equal(berthType, types[(n - 1) % 8]);
  }
});

test('different users are spread across coaches', () => {
  const coaches = new Set(Array.from({ length: 300 }, (_, i) => berthFor(`cuser${i}`).coach));
  assert.equal(coaches.size, 12);
});

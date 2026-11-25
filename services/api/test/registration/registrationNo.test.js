import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRegistrationNo } from '../../src/utils/registrationNo.js';

test('removes spaces and upper-cases', () => {
  assert.equal(normalizeRegistrationNo('2024 ps 01'), '2024PS01');
  assert.equal(normalizeRegistrationNo(' 2024ps01 '), '2024PS01');
  assert.equal(normalizeRegistrationNo('2024\tPS\n01'), '2024PS01');
});

test('two spellings of the same number give the same result', () => {
  assert.equal(normalizeRegistrationNo('2024 ps 01'), normalizeRegistrationNo('2024PS01'));
});

test('null and undefined pass through unchanged', () => {
  assert.equal(normalizeRegistrationNo(null), null);
  assert.equal(normalizeRegistrationNo(undefined), undefined);
});

test('a number is converted to text first', () => {
  assert.equal(normalizeRegistrationNo(2024), '2024');
});

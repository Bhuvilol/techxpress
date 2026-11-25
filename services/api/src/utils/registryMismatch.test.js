import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registryMismatches } from './registryMismatch.js';

const entry = {
  email: 'asha@college.edu',
  institutionId: 'inst_a',
  institution: { name: 'College A' },
};

test('no registry row means no mismatch', () => {
  assert.deepEqual(registryMismatches({ email: 'x@y.z', institutionId: 'inst_b' }, null), []);
});

test('same institution and email (any letter case) means no mismatch', () => {
  const user = { email: 'Asha@College.edu', institutionId: 'inst_a' };
  assert.deepEqual(registryMismatches(user, entry), []);
});

test('a different institution is reported with both names', () => {
  const user = { email: 'asha@college.edu', institutionId: 'inst_b', institution: { id: 'inst_b', name: 'College B' } };
  assert.deepEqual(registryMismatches(user, entry), [
    { field: 'institution', expected: 'College A', actual: 'College B' },
  ]);
});

test('institution as a relation object is read by id', () => {
  const user = { email: 'asha@college.edu', institution: { id: 'inst_a', name: 'College A' } };
  assert.deepEqual(registryMismatches(user, entry), []);
});

test('a different email is reported', () => {
  const user = { email: 'asha.k@gmail.com', institutionId: 'inst_a' };
  assert.deepEqual(registryMismatches(user, entry), [
    { field: 'email', expected: 'asha@college.edu', actual: 'asha.k@gmail.com' },
  ]);
});

test('both differences are reported together', () => {
  const user = { email: 'other@gmail.com', institutionId: 'inst_b', institution: { id: 'inst_b', name: 'College B' } };
  assert.equal(registryMismatches(user, entry).length, 2);
});

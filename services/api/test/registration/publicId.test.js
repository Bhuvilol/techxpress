import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePublicId, USER_PUBLIC_PREFIX, TEAM_PUBLIC_PREFIX } from '../../src/utils/publicId.js';

const FORMAT = /^(TXP|TXT)-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/;

test('a user ID is TXP-XXXX-XXXX and a team ID is TXT-XXXX-XXXX', () => {
  assert.match(generatePublicId(USER_PUBLIC_PREFIX), /^TXP-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/);
  assert.match(generatePublicId(TEAM_PUBLIC_PREFIX), /^TXT-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/);
});

test('never uses look-alike characters 0, 1, I, L, O or U', () => {
  for (let i = 0; i < 2000; i += 1) {
    assert.doesNotMatch(generatePublicId('TXP').slice(4), /[01ILOU]/);
  }
});

test('2,000 IDs are all different and all match the format', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i += 1) {
    const id = generatePublicId('TXP');
    assert.match(id, FORMAT);
    seen.add(id);
  }
  assert.equal(seen.size, 2000);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIdCardDataUrl, ID_CARD_MAX_BYTES } from '../../src/utils/idCard.js';

const dataUrl = (mime, bytes) => `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13];
const WEBP = [...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP'), 0, 0];

test('accepts a JPEG, PNG and WebP by their real file signature', () => {
  for (const [mime, bytes, type] of [
    ['image/jpeg', JPEG, 'image/jpeg'],
    ['image/png', PNG, 'image/png'],
    ['image/webp', WEBP, 'image/webp'],
  ]) {
    const r = parseIdCardDataUrl(dataUrl(mime, bytes));
    assert.equal(r.error, undefined, mime);
    assert.equal(r.mimeType, type);
    assert.equal(r.sizeBytes, bytes.length);
    assert.ok(Buffer.isBuffer(r.data));
  }
});

test('accepts the image/jpg spelling', () => {
  assert.equal(parseIdCardDataUrl(dataUrl('image/jpg', JPEG)).mimeType, 'image/jpeg');
});

test('trusts the bytes, not the declared type', () => {
  // A PNG labelled as JPEG is stored as the PNG it really is.
  assert.equal(parseIdCardDataUrl(dataUrl('image/jpeg', PNG)).mimeType, 'image/png');
});

test('rejects a file that is not an image by its bytes', () => {
  const text = Buffer.from('this is not an image at all');
  const r = parseIdCardDataUrl(`data:image/png;base64,${text.toString('base64')}`);
  assert.match(r.error, /JPG, PNG or WebP/);
});

test('rejects a declared image type that is not allowed (svg, gif)', () => {
  assert.match(parseIdCardDataUrl(dataUrl('image/svg+xml', JPEG)).error, /JPG, PNG or WebP/);
  assert.match(parseIdCardDataUrl(`data:image/gif;base64,${Buffer.from(JPEG).toString('base64')}`).error, /JPG, PNG or WebP/);
});

test('rejects a value without the data-URL prefix', () => {
  assert.match(parseIdCardDataUrl(Buffer.from(JPEG).toString('base64')).error, /JPG, PNG or WebP/);
});

test('rejects an empty or missing value', () => {
  assert.match(parseIdCardDataUrl('').error, /Upload a photo/);
  assert.match(parseIdCardDataUrl(undefined).error, /Upload a photo/);
  assert.match(parseIdCardDataUrl(42).error, /Upload a photo/);
});

test('rejects an image over 1.5 MB decoded', () => {
  const big = Buffer.alloc(ID_CARD_MAX_BYTES + 1);
  Buffer.from(JPEG).copy(big);
  assert.match(parseIdCardDataUrl(dataUrl('image/jpeg', big)).error, /too large/);
});

test('accepts an image exactly at the 1.5 MB limit', () => {
  const edge = Buffer.alloc(ID_CARD_MAX_BYTES);
  Buffer.from(JPEG).copy(edge);
  assert.equal(parseIdCardDataUrl(dataUrl('image/jpeg', edge)).error, undefined);
});

test('rejects a data URL whose text is far too long, before decoding it', () => {
  const huge = `data:image/jpeg;base64,${'A'.repeat(3 * 1024 * 1024)}`;
  assert.match(parseIdCardDataUrl(huge).error, /too large/);
});

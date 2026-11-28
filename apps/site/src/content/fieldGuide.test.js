import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIELD_GUIDE } from './fieldGuide.js';

// Field names used by the registration form's FieldWrap components.
const formFields = () => {
  const src = readFileSync(new URL('../ui/panels/ReservationCounter.jsx', import.meta.url), 'utf8');
  return [...new Set([...src.matchAll(/<FieldWrap[^>]*?\sfield="([A-Za-z]+)"/gs)].map((m) => m[1]))];
};

describe('field guide', () => {
  it('has help for every field on the registration form', () => {
    const missing = formFields().filter((f) => !FIELD_GUIDE[f]);
    expect(missing).toEqual([]);
  });

  it('has no help for a field the form does not have', () => {
    const fields = formFields();
    const stray = Object.keys(FIELD_GUIDE).filter((f) => !fields.includes(f));
    expect(stray).toEqual([]);
  });

  it('gives every field a non-empty "what"', () => {
    for (const [field, g] of Object.entries(FIELD_GUIDE)) {
      expect(g.what?.trim(), field).toBeTruthy();
    }
  });
});

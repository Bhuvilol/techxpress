import { describe, expect, it } from 'vitest';
import { normalizeRegistrationNo } from './registrationNo';

describe('normalizeRegistrationNo', () => {
  it('removes spaces and upper-cases, so the same student has one number', () => {
    expect(normalizeRegistrationNo('2024 ps 01')).toBe('2024PS01');
    expect(normalizeRegistrationNo(' 2024ps01 ')).toBe('2024PS01');
  });

  it('turns null and undefined into an empty string', () => {
    expect(normalizeRegistrationNo(null)).toBe('');
    expect(normalizeRegistrationNo(undefined)).toBe('');
  });
});

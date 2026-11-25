import { randomInt } from 'node:crypto';

// Human-friendly reference for a user or team, e.g. TXP-7K3M-9QWA.
// The alphabet leaves out 0, 1, I, L, O and U, so the code reads out clearly.
// The unique index on publicId is the real guard against a repeat.

export const USER_PUBLIC_PREFIX = 'TXP';
export const TEAM_PUBLIC_PREFIX = 'TXT';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

export const generatePublicId = (prefix) => {
  let code = '';
  for (let i = 0; i < 8; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${code.slice(0, 4)}-${code.slice(4)}`;
};

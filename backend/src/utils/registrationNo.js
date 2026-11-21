// Registration numbers have ONE canonical form: no whitespace, upper-case.
// "2024 ps 01", " 2024PS01 " and "2024ps01" are all the same student.
//
// Apply at every entry point (registration, registry upload, testing import,
// admin lookup, explore search) and before every lookup. The database also
// enforces it: see migration 20261122_registration_no_canonical (CHECK
// constraint), which together with the existing unique index makes
// registration numbers effectively case-insensitively unique.

export const normalizeRegistrationNo = (value) =>
  value == null ? value : String(value).replace(/\s+/g, '').toUpperCase();

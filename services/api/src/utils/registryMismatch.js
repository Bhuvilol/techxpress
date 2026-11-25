// Compares a student's self-declared details with their college registry row.
//
// The student picks their institution and types their email, so neither is
// trusted. The registry is the college's own list. When the two disagree the
// approval is blocked until an admin confirms it (see approveStudent).
//
// Returns [] when there is no registry row or everything agrees, otherwise a
// list of { field, expected, actual }.
export const registryMismatches = (user, entry) => {
  if (!entry) return [];
  const mismatches = [];
  // The lists return the institution as a relation ({ id, name }), not as a bare id.
  const userInstitutionId = user.institutionId ?? user.institution?.id ?? null;
  if (userInstitutionId && entry.institutionId !== userInstitutionId) {
    mismatches.push({ field: 'institution', expected: entry.institution?.name ?? entry.institutionId, actual: user.institution?.name ?? userInstitutionId });
  }
  if (user.email && entry.email && entry.email.toLowerCase() !== user.email.toLowerCase()) {
    mismatches.push({ field: 'email', expected: entry.email, actual: user.email });
  }
  return mismatches;
};

// Coach and berth printed on a confirmed student's e-ticket (a souvenir, not a
// real seat). Derived from the user id so it never changes for a student and
// needs no database column.
//
// Coaches TX-01 … TX-12, berths 1 … 72 with the berth type of an Indian
// Railways 3-tier coach: each bay of 8 is LB, MB, UB, LB, MB, UB, SL, SU.

const BERTH_TYPES = ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'];
export const COACHES = 12;
export const BERTHS_PER_COACH = 72;

// FNV-1a, 32-bit: small, fast and stable across Node versions.
const fnv1a = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

export const berthFor = (userId) => {
  const hash = fnv1a(String(userId));
  const coachNo = (hash % COACHES) + 1;
  const berthNo = (Math.floor(hash / COACHES) % BERTHS_PER_COACH) + 1;
  return {
    coach: `TX-${String(coachNo).padStart(2, '0')}`,
    berth: String(berthNo),
    berthType: BERTH_TYPES[(berthNo - 1) % BERTH_TYPES.length],
  };
};

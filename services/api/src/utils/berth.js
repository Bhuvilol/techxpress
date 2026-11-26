// Coach and berth printed on a confirmed student's e-ticket (a souvenir, not a
// real seat), from the student's seat number. Seat numbers are unique (given
// once, on approval; see assignSeat in user.service.js), so no two students
// share a coach and berth.
//
// 72 berths per coach, filled in order: seat 1 is TX-01 berth 1, seat 73 is
// TX-02 berth 1, and so on with no upper limit. The berth type follows an
// Indian Railways 3-tier coach: each bay of 8 is LB, MB, UB, LB, MB, UB, SL, SU.

const BERTH_TYPES = ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'];
export const BERTHS_PER_COACH = 72;

export const seatToBerth = (seatNo) => {
  if (!Number.isInteger(seatNo) || seatNo < 1) return { coach: null, berth: null, berthType: null };
  const coachNo = Math.floor((seatNo - 1) / BERTHS_PER_COACH) + 1;
  const berthNo = ((seatNo - 1) % BERTHS_PER_COACH) + 1;
  return {
    coach: `TX-${String(coachNo).padStart(2, '0')}`,
    berth: String(berthNo),
    berthType: BERTH_TYPES[(berthNo - 1) % BERTH_TYPES.length],
  };
};

import { userService } from '../services/user.service.js';
import { rulesService } from '../services/rules.service.js';
import { seatToBerth } from '../utils/berth.js';

// Railway wording for each account status (the train site shows it as a stamp).
const PNR_STATUS = {
  NO_RESERVATION: 'NO_RESERVATION',
  PENDING: 'WAITLISTED',
  REJECTED: 'NOT_CONFIRMED',
  REVOKED: 'CANCELLED',
  VERIFIED: 'CONFIRMED',
};

// Event details printed on the e-ticket.
const TICKET_TRAIN = '12026 TECHXPRESS';
const TICKET_DATE = '2026-12-04';

// Public endpoints — no auth.

// Lets the registration page show "closed" before the student fills the form.
export const status = async (_req, res) => {
  const rules = await rulesService.get();
  res.json({ open: rules.registrationOpen });
};

// Creates a PENDING student. Never issues a password here; that happens only
// at approval time. The response deliberately says nothing about whether the
// registration number exists in the college registry — that would let anyone
// probe the registry. Admins see the registry match in the verification queue.
export const register = async (req, res) => {
  const user = await userService.createPendingStudent(req.body);

  res.status(202).json({
    message: 'Registration submitted. Awaiting organizer verification.',
    user: { id: user.id, publicId: user.publicId, fullName: user.fullName, email: user.email },
  });
};

// PNR status: registration number + email → status, and for a confirmed
// student the details for their souvenir e-ticket. Never returns contact
// details, the registration number or internal ids.
export const pnr = async (req, res) => {
  const { status: accountStatus, user } = await userService.lookupPnr(req.body);
  const status = PNR_STATUS[accountStatus] ?? PNR_STATUS.NO_RESERVATION;

  res.set('Cache-Control', 'no-store');
  if (status !== 'CONFIRMED') return res.json({ status });

  res.json({
    status,
    ticket: {
      pnr: user.publicId,
      name: user.fullName,
      institution: user.institution?.name ?? null,
      domain: user.domain?.name ?? null,
      train: TICKET_TRAIN,
      date: TICKET_DATE,
      ...seatToBerth(user.seatNo),
    },
  });
};

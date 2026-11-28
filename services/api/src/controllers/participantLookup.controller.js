import { prisma } from '../config/db.js';
import { isDomainExpertFor } from '../utils/domainExperts.js';
import { NotFound } from '../utils/errors.js';
import { normalizeRegistrationNo } from '../utils/registrationNo.js';
import { ADMIN_MEMBER_FIELDS } from '../utils/adminMemberFields.js';

// A passenger reference anywhere in the input: a bare "TXP-7K3M-9QWA", any
// case, or a QR payload that wraps it (e.g. a link).
const TXP_REF = /TXP-[0-9A-Z]{4}-[0-9A-Z]{4}/i;

// GET /api/admin/verification/participant?ref=...
// The check-in desk: one student's full details and their team, found by
// passenger reference (from their QR or typed) or by registration number.
export const participantLookup = async (req, res) => {
  const raw = req.query.ref;
  const txp = raw.match(TXP_REF)?.[0].toUpperCase();
  const where = txp ? { publicId: txp } : { registrationNo: normalizeRegistrationNo(raw) };

  const user = await prisma.user.findFirst({
    where: { ...where, role: 'STUDENT' },
    select: {
      ...ADMIN_MEMBER_FIELDS,
      createdAt: true,
      membership: {
        select: {
          role: true,
          joinedAt: true,
          team: {
            select: {
              id: true, publicId: true, name: true, status: true, leaderId: true,
              domain: { select: { id: true, name: true } },
              problemStatement: { select: { id: true, title: true } },
              members: {
                orderBy: { joinedAt: 'asc' },
                select: { user: { select: { id: true, fullName: true, publicId: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!user) throw NotFound(txp ? `No participant with reference ${txp}.` : 'No participant with that reference or registration number.');

  const { idCard, membership, ...rest } = user;
  const team = membership?.team ?? null;
  res.json({
    participant: {
      ...rest,
      hasIdCard: Boolean(idCard),
      // Expert for their team's domain by the institution/branch table (no team: no).
      isDomainExpert: Boolean(team) && isDomainExpertFor({ institution: rest.institution?.name ?? null, branch: rest.branch ?? null }, team.domain?.name),
    },
    team: team && {
      ...team,
      joinedAt: membership.joinedAt,
      isLeader: team.leaderId === user.id,
      members: team.members.map(({ user: m }) => ({ ...m, isLeader: m.id === team.leaderId })),
    },
  });
};

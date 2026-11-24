import { prisma } from '../config/db.js';
import { Forbidden, NotFound } from '../utils/errors.js';

// Intra-team chat. The single rule: only CURRENT members of a team can read
// or post its messages. Checked on every call (not just in the UI), so a
// member who leaves or is dismissed loses access immediately. Admins, jury,
// coordinators and other students are all outsiders here.

const MESSAGE_SELECT = {
  id: true,
  teamId: true,
  body: true,
  createdAt: true,
  sender: { select: { id: true, fullName: true } },
};

const assertMember = async (teamId, userId) => {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
  if (!team) throw NotFound('Team not found');
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { userId: true },
  });
  if (!member) throw Forbidden('Only members of this team can use its chat');
};

export const teamChatService = {
  /**
   * Newest `limit` messages (optionally older than `before`), returned in
   * chronological order. `hasMore` tells the UI whether to offer
   * "Load earlier".
   */
  async list({ teamId, userId, before, limit = 50 }) {
    await assertMember(teamId, userId);
    const rows = await prisma.teamMessage.findMany({
      where: { teamId, ...(before && { createdAt: { lt: before } }) },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    return { messages: rows.slice(0, limit).reverse(), hasMore };
  },

  async post({ teamId, userId, body }) {
    await assertMember(teamId, userId);
    return prisma.teamMessage.create({
      data: { teamId, senderId: userId, body },
      select: MESSAGE_SELECT,
    });
  },
};

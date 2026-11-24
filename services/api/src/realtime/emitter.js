import { getIO } from './io.js';
import { logger } from '../utils/logger.js';

// Typed emit helpers. Services and controllers call these; they never
// touch the raw io instance. Each helper guards against the io being
// uninitialized (e.g. during seed scripts or unit tests) so backend code
// can call them unconditionally without try/catch.
//
// Event naming: namespace:action — matches what the client subscribes to.

const safeEmit = (room, event, payload) => {
  try {
    getIO().to(room).emit(event, payload);
  } catch (err) {
    // io not ready (seed/script context) — log and move on. We DO NOT
    // want a missing socket layer to break a successful business action.
    logger.debug('realtime.emit_skipped', { room, event, reason: err.message });
  }
};

// ── session control
// Drop every open socket for a user (e.g. right after their access is revoked).
export const disconnectUser = (userId) => {
  try {
    getIO().in(`user:${userId}`).disconnectSockets(true);
  } catch (err) {
    logger.debug('realtime.disconnect_skipped', { userId, reason: err.message });
  }
};

// ── global
export const emitBroadcastNew = (broadcast) =>
  safeEmit('global', 'broadcast:new', { broadcast });

export const emitLeaderboardChanged = () =>
  safeEmit('global', 'leaderboard:changed', { at: new Date().toISOString() });

// ── per-user inbox
export const emitInviteReceived = (inviteeId, invite) =>
  safeEmit(`user:${inviteeId}`, 'invite:received', { invite });

export const emitInviteResolved = (inviterId, invite) =>
  safeEmit(`user:${inviterId}`, 'invite:resolved', { invite });

export const emitJoinRequestReceived = (leaderId, request) =>
  safeEmit(`user:${leaderId}`, 'join-request:received', { request });

export const emitJoinRequestResolved = (requesterId, request) =>
  safeEmit(`user:${requesterId}`, 'join-request:resolved', { request });

export const emitMembershipChangeReceived = (approverId, change) =>
  safeEmit(`user:${approverId}`, 'membership-change:received', { change });

// ── per-team
export const emitTeamMemberJoined = (teamId, member) =>
  safeEmit(`team:${teamId}`, 'team:member-joined', { member });

export const emitTeamMemberLeft = (teamId, userId) =>
  safeEmit(`team:${teamId}`, 'team:member-left', { userId });

export const emitTeamFinalized = (teamId, team) =>
  safeEmit(`team:${teamId}`, 'team:finalized', { team });

// New chat message → everyone currently in the team's room (members only).
export const emitTeamMessage = (teamId, message) =>
  safeEmit(`team:${teamId}`, 'team:message', { message });

// Pull a user's sockets out of a team room (after they leave / are removed),
// so they stop receiving that team's live chat immediately.
export const removeUserFromTeamRoom = (userId, teamId) => {
  try {
    getIO().in(`user:${userId}`).socketsLeave(`team:${teamId}`);
  } catch (err) {
    logger.debug('realtime.leave_skipped', { userId, teamId, reason: err.message });
  }
};

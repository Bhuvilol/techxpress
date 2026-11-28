import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ah } from '../utils/asyncHandler.js';

import {
  createTeamSchema,
  changeProblemStatementSchema,
  teamIdParamSchema,
  listTeamsQuerySchema,
  listJoinableQuerySchema,
  listExploreMembersQuerySchema,
  createInviteSchema,
  listTeamInvitesQuerySchema,
  listTeamRequestsQuerySchema,
  leaveSchema,
  dismissSchema,
  transferLeadershipSchema,
  listTeamMessagesQuerySchema,
  postTeamMessageSchema,
} from '../validators/team.schema.js';
import { teamChatLimiter } from '../middleware/rateLimit.js';

import * as team    from '../controllers/team.controller.js';
import * as invite  from '../controllers/invite.controller.js';
import * as join    from '../controllers/joinRequest.controller.js';
import { teamInviteRefParamSchema } from '../validators/team.schema.js';
import * as change  from '../controllers/membershipChange.controller.js';
import * as evaluation from '../controllers/evaluation.controller.js';
import * as chat from '../controllers/teamChat.controller.js';

const router = Router();

// Public: preview of a team from its invite link (/vortex/join/TXT-XXXX-XXXX),
// so someone not logged in sees which team invited them. Safe fields only.
router.get('/invite/:ref', validate({ params: teamInviteRefParamSchema }), ah(team.invitePreview));

router.use(requireAuth);

// ── team
router.get('/',          validate({ query: listTeamsQuerySchema }), ah(team.list));
router.get('/mine',      ah(team.mine));
router.get('/joinable',  validate({ query: listJoinableQuerySchema }), ah(team.listJoinable));
router.get('/explore/members', requireRole('STUDENT'), validate({ query: listExploreMembersQuerySchema }), ah(team.listAvailableMembers));

router.post('/',
  requireRole('STUDENT'),
  validate({ body: createTeamSchema }),
  ah(team.create),
);

router.get('/:id',
  validate({ params: teamIdParamSchema }),
  ah(team.get),
);

router.get('/:id/evaluation',
  validate({ params: teamIdParamSchema }),
  ah(team.evaluate),
);

router.get('/:id/scores',
  validate({ params: teamIdParamSchema }),
  ah(evaluation.teamScores),
);

router.patch('/:id/problem-statement',
  requireRole('STUDENT'),
  validate({ params: teamIdParamSchema, body: changeProblemStatementSchema }),
  ah(team.changeProblemStatement),
);

router.post('/:id/finalize',
  requireRole('STUDENT'),
  validate({ params: teamIdParamSchema }),
  ah(team.finalize),
);

router.delete('/:id',
  requireRole('STUDENT'),
  validate({ params: teamIdParamSchema }),
  ah(team.disband),
);

router.post('/:id/transfer-leadership',
  requireRole('STUDENT'),
  validate({ params: teamIdParamSchema, body: transferLeadershipSchema }),
  ah(team.transferLeadership),
);

// ── invites scoped to a team
router.post('/:id/invites',
  requireRole('STUDENT'),
  validate({ params: teamIdParamSchema, body: createInviteSchema }),
  ah(invite.create),
);
router.get('/:id/invites',
  validate({ params: teamIdParamSchema, query: listTeamInvitesQuerySchema }),
  ah(invite.listForTeam),
);

// ── join requests scoped to a team
router.post('/:id/join-requests',
  requireRole('STUDENT'),
  validate({ params: teamIdParamSchema }),
  ah(join.create),
);
router.get('/:id/join-requests',
  validate({ params: teamIdParamSchema, query: listTeamRequestsQuerySchema }),
  ah(join.listForTeam),
);

// ── team chat (current members only — enforced in teamChat.service)
router.get('/:id/messages',
  requireRole('STUDENT'),
  validate({ params: teamIdParamSchema, query: listTeamMessagesQuerySchema }),
  ah(chat.list),
);
router.post('/:id/messages',
  requireRole('STUDENT'),
  teamChatLimiter,
  validate({ params: teamIdParamSchema, body: postTeamMessageSchema }),
  ah(chat.post),
);

// ── membership changes scoped to a team
router.post('/:id/leave',
  requireRole('STUDENT'),
  validate({ params: teamIdParamSchema, body: leaveSchema }),
  ah(change.requestLeave),
);
router.post('/:id/dismiss',
  requireRole('STUDENT'),
  validate({ params: teamIdParamSchema, body: dismissSchema }),
  ah(change.requestDismiss),
);

export default router;

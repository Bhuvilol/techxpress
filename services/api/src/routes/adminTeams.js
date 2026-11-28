import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ah } from '../utils/asyncHandler.js';
import {
  teamIdParamSchema,
  forceAddSchema,
  forceRemoveSchema,
  setStatusSchema,
  transferLeadershipSchema,
} from '../validators/team.schema.js';
import * as admin from '../controllers/teamAdmin.controller.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

// Full member profiles for one team (contact details, college, ID card flag).
router.get('/:id/members',
  validate({ params: teamIdParamSchema }),
  ah(admin.teamMembers),
);

router.post('/:id/force-add',
  validate({ params: teamIdParamSchema, body: forceAddSchema }),
  ah(admin.forceAddMember),
);

router.post('/:id/set-leader',
  validate({ params: teamIdParamSchema, body: transferLeadershipSchema }),
  ah(admin.setLeader),
);

router.post('/:id/force-remove',
  validate({ params: teamIdParamSchema, body: forceRemoveSchema }),
  ah(admin.forceRemoveMember),
);

router.delete('/:id',
  validate({ params: teamIdParamSchema }),
  ah(admin.disbandTeam),
);

router.post('/:id/force-finalize',
  validate({ params: teamIdParamSchema }),
  ah(admin.forceFinalize),
);

router.post('/:id/set-status',
  validate({ params: teamIdParamSchema, body: setStatusSchema }),
  ah(admin.setStatus),
);

router.post('/:id/disqualify',
  validate({ params: teamIdParamSchema }),
  ah(admin.disqualify),
);

router.post('/:id/reinstate',
  validate({ params: teamIdParamSchema }),
  ah(admin.reinstate),
);

router.post('/:id/recount',
  validate({ params: teamIdParamSchema }),
  ah(admin.recount),
);

export default router;

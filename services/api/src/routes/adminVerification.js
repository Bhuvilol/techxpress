import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ah } from '../utils/asyncHandler.js';
import {
  userIdParamSchema,
  rejectBodySchema,
  reregisterBodySchema,
  listStudentsQuerySchema,
  lookupByRegistrationNoQuerySchema,
} from '../validators/admin.schema.js';
import {
  stats,
  listPending,
  listStudents,
  lookupByRegistrationNo,
  approve,
  reject,
  revoke,
  restore,
  reissue,
  idCard,
  requestReregistration,
} from '../controllers/adminVerification.controller.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/stats', ah(stats));
router.get('/pending', validate({ query: listStudentsQuerySchema }), ah(listPending));
router.get('/students', validate({ query: listStudentsQuerySchema }), ah(listStudents));
// Resolve a registration number to a user (admin force add/remove member).
router.get('/lookup', validate({ query: lookupByRegistrationNoQuerySchema }), ah(lookupByRegistrationNo));

router.get('/students/:id/id-card',
  validate({ params: userIdParamSchema }), ah(idCard));

router.post('/students/:id/approve',
  validate({ params: userIdParamSchema }), ah(approve));

router.post('/students/:id/reject',
  validate({ params: userIdParamSchema, body: rejectBodySchema }), ah(reject));

router.post('/students/:id/request-reregistration',
  validate({ params: userIdParamSchema, body: reregisterBodySchema }), ah(requestReregistration));

router.post('/students/:id/revoke',
  validate({ params: userIdParamSchema }), ah(revoke));

router.post('/students/:id/restore',
  validate({ params: userIdParamSchema }), ah(restore));

router.post('/students/:id/reissue-password',
  validate({ params: userIdParamSchema }), ah(reissue));

export default router;

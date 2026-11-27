import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ah } from '../utils/asyncHandler.js';
import { directoryService } from '../services/directory.service.js';
import { directoryQuerySchema, updateBranchSchema, updateDomainsSchema, updateTshirtSizeSchema } from '../validators/students.schema.js';
import { userService } from '../services/user.service.js';

// Participant directory — any logged-in user (student, jury, coordinator, admin).

const router = Router();

router.get('/directory',
  requireAuth,
  validate({ query: directoryQuerySchema }),
  ah(async (req, res) => {
    const result = await directoryService.list(req.query);
    res.json(result);
  }),
);

// A student changes their own 4 domains (first = main domain).
router.patch('/me/domains',
  requireAuth,
  requireRole('STUDENT'),
  validate({ body: updateDomainsSchema }),
  ah(async (req, res) => {
    const user = await userService.updateDomains(req.user.id, req.body.preferredDomains);
    res.json({ user });
  }),
);

// A student sets or changes their T-shirt size.
router.patch('/me/tshirt-size',
  requireAuth,
  requireRole('STUDENT'),
  validate({ body: updateTshirtSizeSchema }),
  ah(async (req, res) => {
    const user = await userService.updateTshirtSize(req.user.id, req.body.tshirtSize);
    res.json({ user });
  }),
);

// An ITER | SOA student sets or changes their branch (students who registered
// before the field existed are asked by a banner in the portal).
router.patch('/me/branch',
  requireAuth,
  requireRole('STUDENT'),
  validate({ body: updateBranchSchema }),
  ah(async (req, res) => {
    const user = await userService.updateBranch(req.user.id, req.body.branch);
    res.json({ user });
  }),
);

export default router;

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ah } from '../utils/asyncHandler.js';
import { directoryService } from '../services/directory.service.js';
import { directoryQuerySchema } from '../validators/students.schema.js';

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

export default router;

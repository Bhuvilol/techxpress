import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ah } from '../utils/asyncHandler.js';
import { directoryService } from '../services/directory.service.js';

// Participant directory — any logged-in user (student, jury, coordinator, admin).

const router = Router();

router.get('/directory', requireAuth, ah(async (_req, res) => {
  const students = await directoryService.list();
  res.json({ count: students.length, students });
}));

export default router;

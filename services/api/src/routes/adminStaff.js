import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ah } from '../utils/asyncHandler.js';
import * as staff from '../controllers/staff.controller.js';

// GET /api/admin/staff — staff accounts with their login codes. Admin only.
const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', ah(staff.list));

export default router;

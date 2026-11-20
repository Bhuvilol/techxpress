import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { registrationLimiter } from '../middleware/rateLimit.js';
import { ah } from '../utils/asyncHandler.js';
import { registrationSchema } from '../validators/registration.schema.js';
import { register, status } from '../controllers/registration.controller.js';

const router = Router();

router.get('/status', ah(status));
router.post('/', registrationLimiter, validate({ body: registrationSchema }), ah(register));

export default router;

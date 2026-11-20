import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { registrationLimiter } from '../middleware/rateLimit.js';
import { ah } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { registrationSchema } from '../validators/registration.schema.js';
import { register, status } from '../controllers/registration.controller.js';

const router = Router();

// Honeypot: the form has a hidden "website" field that real users never see.
// Bots that auto-fill every input fill it in. Pretend success so the bot
// doesn't adapt, but create nothing. Must run before validation, which strips
// unknown fields.
const honeypot = (req, res, next) => {
  const trap = req.body?.website;
  if (typeof trap === 'string' && trap.trim()) {
    logger.warn('registration.honeypot', { ip: req.ip });
    return res.status(202).json({
      message: 'Registration submitted. Awaiting organizer verification.',
      user: null,
    });
  }
  next();
};

router.get('/status', ah(status));
router.post('/', registrationLimiter, honeypot, validate({ body: registrationSchema }), ah(register));

export default router;

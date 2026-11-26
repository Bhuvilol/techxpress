import express, { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { registrationLimiter, pnrPerIpLimiter, pnrPerRegistrationNoLimiter } from '../middleware/rateLimit.js';
import { ah } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { registrationSchema, pnrSchema } from '../validators/registration.schema.js';
import { register, status, pnr } from '../controllers/registration.controller.js';

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
// The form includes the ID card photo (shrunk in the browser, at most 1.5 MB
// decoded, so about 2 mb as base64). The rate limiter runs first, so the
// bigger body is only parsed for requests that are allowed through.
const registrationBody = express.json({ limit: '2mb' });

router.post('/', registrationLimiter, registrationBody, honeypot, validate({ body: registrationSchema }), ah(register));

// PNR status check from the train site. The app-wide 100 kb parser normally
// parses the body first; this small parser is a no-op then, and keeps the
// route self-contained (tests mount the router alone). The per-number limiter
// needs the parsed body, so it runs after the parser.
const pnrBody = express.json({ limit: '10kb' });
router.post('/pnr', pnrPerIpLimiter, pnrBody, pnrPerRegistrationNoLimiter, validate({ body: pnrSchema }), ah(pnr));

export default router;

import { env } from './config/env.js';
import { prisma } from './config/db.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { logger } from './utils/logger.js';
import { requestLog } from './middleware/requestLog.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import registrationRoutes from './routes/registration.js';
import adminVerificationRoutes from './routes/adminVerification.js';
import coordinatorVerificationRoutes from './routes/coordinatorVerification.js';
import registryRoutes from './routes/registry.js';
import teamRoutes from './routes/teams.js';
import inviteRoutes from './routes/invites.js';
import joinRequestRoutes from './routes/joinRequests.js';
import membershipChangeRoutes from './routes/membershipChanges.js';
import adminTeamRoutes from './routes/adminTeams.js';
import adminRulesRoutes from './routes/adminRules.js';
import adminJuryRoutes from './routes/adminJury.js';
import adminRoundsRoutes from './routes/adminRounds.js';
import roundsRoutes from './routes/rounds.js';
import juryRoutes from './routes/jury.js';
import leaderboardRoutes from './routes/leaderboard.js';
import { publicRouter as broadcastPublicRouter, adminRouter as broadcastAdminRouter } from './routes/broadcast.js';
import adminAuditRoutes from './routes/adminAudit.js';
import adminTestingRoutes from './routes/adminTesting.js';
import { publicRouter as taxonomyPublicRouter, adminRouter as taxonomyAdminRouter } from './routes/taxonomy.js';
import awardsRoutes from './routes/awards.js';
import studentsRoutes from './routes/students.js';

import { initIO, closeIO } from './realtime/io.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY_HOPS);

// Security headers first, then CORS so preflights carry helmet's headers too.
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // allow same-origin / curl / server-to-server (no Origin header)
      if (!origin) return cb(null, true);
      if (env.CORS_ORIGIN.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

// Before the body parsers, so requests they reject (413, bad JSON) are logged.
app.use(requestLog);

// Request bodies are small JSON (the profile photo is a URL, not an upload),
// so cap them at 100 kb. The only exception is the testing import, which
// parses its own larger body and exists only when ENABLE_TESTING_IMPORT=true.
const TESTING_PATH = '/api/admin/testing';
const smallJson = express.json({ limit: '100kb' });
const smallForm = express.urlencoded({ extended: true, limit: '100kb' });
app.use((req, res, next) => {
  if (env.ENABLE_TESTING_IMPORT && req.path.startsWith(TESTING_PATH)) return next();
  smallJson(req, res, (err) => (err ? next(err) : smallForm(req, res, next)));
});

// Readiness (checks the database) and liveness probes — see routes/health.js.
app.use('/api/health', healthRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/admin/verification', adminVerificationRoutes);
app.use('/api/coordinator/verification', coordinatorVerificationRoutes);
app.use('/api/admin/registry', registryRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/membership-changes', membershipChangeRoutes);
app.use('/api/admin/teams', adminTeamRoutes);
app.use('/api/admin/rules', adminRulesRoutes);
app.use('/api/admin/jury-assignments', adminJuryRoutes);
app.use('/api/admin/rounds', adminRoundsRoutes);
app.use('/api/rounds', roundsRoutes);
app.use('/api/jury', juryRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/broadcast', broadcastPublicRouter);
app.use('/api/admin/broadcast', broadcastAdminRouter);
app.use('/api/admin/audit-logs', adminAuditRoutes);
if (env.ENABLE_TESTING_IMPORT) {
  app.use(TESTING_PATH, express.json({ limit: '5mb' }), adminTestingRoutes);
  logger.warn('testing import enabled — keep ENABLE_TESTING_IMPORT off in production');
}
app.use('/api/taxonomy', taxonomyPublicRouter);
app.use('/api/admin/taxonomy', taxonomyAdminRouter);
app.use('/api/awards', awardsRoutes);
app.use('/api/students', studentsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  logger.info('server started', { port: env.PORT, env: env.NODE_ENV });
});

initIO(server);

const shutdown = async (signal) => {
  logger.info('shutdown', { signal });
  await closeIO();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // hard exit if close() hangs
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', { reason: String(reason) }));
process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { err: err.message, stack: err.stack });
  process.exit(1);
});

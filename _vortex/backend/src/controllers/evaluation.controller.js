import { evaluationService } from '../services/evaluation.service.js';
import { auditService } from '../services/audit.service.js';
import { rulesService } from '../services/rules.service.js';
import { prisma } from '../config/db.js';
import { Forbidden } from '../utils/errors.js';
import { emitLeaderboardChanged } from '../realtime/emitter.js';

export const submit = async (req, res) => {
  const result = await evaluationService.submit({
    teamId:   req.body.teamId,
    round:    req.body.round,
    juryId:   req.user.id,
    scores:   req.body.scores,
    feedback: req.body.feedback,
  });

  auditService.record({
    actorId: req.user.id,
    action:  'SCORE_SUBMITTED',
    entityType: 'Evaluation',
    entityId: result.evaluation.id,
    details: { teamId: req.body.teamId, round: req.body.round, total: result.evaluation.total },
  });

  emitLeaderboardChanged(); // leaderboard page refetches live

  res.status(201).json(result);
};

// Per-team score breakdown + jury feedback.
//   ADMIN / JURY  → full detail (needed for judging)
//   STUDENT       → own team only, only once the admin has turned on
//                   "Show marks", and without the scoring juror's identity
//   anyone else   → 403
export const teamScores = async (req, res) => {
  const teamId = req.params.id;
  const { role, id: userId } = req.user;

  if (role === 'ADMIN' || role === 'JURY') {
    const evaluations = await evaluationService.listForTeam({ teamId });
    return res.json({ count: evaluations.length, evaluations });
  }

  if (role !== 'STUDENT') throw Forbidden('Not allowed to view team scores');

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { userId: true },
  });
  if (!member) throw Forbidden("You can only view your own team's scores");

  const rules = await rulesService.get();
  if (!rules.showMarks) {
    throw Forbidden('Scores have not been released yet', { code: 'MARKS_HIDDEN' });
  }

  const evaluations = (await evaluationService.listForTeam({ teamId }))
    .map(({ jury: _jury, juryId: _juryId, ...evaluation }) => evaluation);
  res.json({ count: evaluations.length, evaluations });
};

export const myEvaluations = async (req, res) => {
  const evaluations = await evaluationService.listForJury({
    juryId: req.user.id,
    round:  req.query.round,
  });
  res.json({ count: evaluations.length, evaluations });
};

// Jury "scoring board": every FINALIZED team with the per-round score that
// already exists (if any). Powers the open-scoring UI so juries can see at
// a glance which (team, round) slots are still up for grabs and which are
// owned. Includes the scorer's name for the 'already scored by X' badge.
export const scoringBoard = async (_req, res) => {
  const teams = await prisma.team.findMany({
    where: { status: 'FINALIZED' },
    select: {
      id: true, name: true,
      domain: { select: { id: true, name: true } },
      problemStatement: { select: { id: true, title: true } },
      evaluations: {
        select: {
          id: true, round: true, total: true,
          jury: { select: { id: true, fullName: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ count: teams.length, teams });
};

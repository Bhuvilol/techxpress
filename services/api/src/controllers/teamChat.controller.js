import { teamChatService } from '../services/teamChat.service.js';
import { emitTeamMessage } from '../realtime/emitter.js';

export const list = async (req, res) => {
  const result = await teamChatService.list({
    teamId: req.params.id,
    userId: req.user.id,
    before: req.query.before,
    limit: req.query.limit,
  });
  res.json(result);
};

export const post = async (req, res) => {
  const message = await teamChatService.post({
    teamId: req.params.id,
    userId: req.user.id,
    body: req.body.body,
  });
  // Live delivery to the team's socket room (members only — joining that
  // room is membership-checked in realtime/io.js).
  emitTeamMessage(req.params.id, message);
  res.status(201).json({ message });
};

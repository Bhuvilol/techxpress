import { userService } from '../services/user.service.js';
import { rulesService } from '../services/rules.service.js';

// Public endpoints — no auth.

// Lets the registration page show "closed" before the student fills the form.
export const status = async (_req, res) => {
  const rules = await rulesService.get();
  res.json({ open: rules.registrationOpen });
};

// Creates a PENDING student. Never issues a password here; that happens only
// at approval time. The response deliberately says nothing about whether the
// registration number exists in the college registry — that would let anyone
// probe the registry. Admins see the registry match in the verification queue.
export const register = async (req, res) => {
  const user = await userService.createPendingStudent(req.body);

  res.status(202).json({
    message: 'Registration submitted. Awaiting organizer verification.',
    user: { id: user.id, publicId: user.publicId, fullName: user.fullName, email: user.email },
  });
};

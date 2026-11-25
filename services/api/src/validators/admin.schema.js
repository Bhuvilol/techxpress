import { z } from 'zod';
import { normalizeRegistrationNo } from '../utils/registrationNo.js';

export const userIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const rejectBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// "Ask to re-register": optional note for the student (e.g. what was unclear).
export const reregisterBodySchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const listStudentsQuerySchema = z.object({
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'REVOKED']).optional(),
  search: z.string().trim().max(120).optional().transform((v) => v || undefined),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  // Narrow the list to one institution. Coordinators tied to an institution
  // are always limited to it, whatever this says.
  institutionId: z.string().cuid().optional(),
});

export const lookupByRegistrationNoQuerySchema = z.object({
  registrationNo: z.string().trim().min(1).max(50).transform(normalizeRegistrationNo),
});

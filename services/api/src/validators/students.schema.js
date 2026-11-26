import { z } from 'zod';
import { domainPicks } from './registration.schema.js';

export const directoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional().transform((v) => v || undefined),
  institutionId: z.string().trim().max(50).optional().transform((v) => v || undefined),
  domainId: z.string().trim().max(50).optional().transform((v) => v || undefined),
  teamFilter: z.enum(['all', 'looking', 'inteam']).optional(),
  groupBy: z.enum(['institution', 'domain']).optional(),
  perCollegeLimit: z.coerce.number().int().min(1).max(50).optional(),
});

// PATCH /api/students/me/domains: the student's 4 domain picks.
export const updateDomainsSchema = z.object({ preferredDomains: domainPicks });

import { z } from 'zod';

export const CreateLinkSchema = z.object({
  originalUrl: z.string().url("Enter a Valid URL"),
  customAlias: z.string().min(3).max(30).optional(),
  expiresAt: z.string().datetime().optional()
});
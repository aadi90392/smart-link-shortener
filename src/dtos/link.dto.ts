import { z } from 'zod';

export const CreateLinkSchema = z.object({
  originalUrl: z.string().url("Enter a Valid URL")
});
import { z } from 'zod';

export const earlyAccessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(5).max(40),
  radioStation: z.string().trim().min(2).max(120),
  cityState: z.string().trim().min(2).max(120),
  website: z.string().trim().max(200).optional().default(''),
  notes: z.string().trim().max(1000).optional().default(''),
  plan: z.enum(['starter', 'standard', 'pro']),
  locale: z.enum(['en', 'pt', 'es']),
});

export type EarlyAccessInput = z.infer<typeof earlyAccessSchema>;

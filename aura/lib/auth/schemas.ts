import { z } from 'zod';

export const signupSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    radioName: z.string().min(2).max(120),
    locale: z.enum(['en', 'pt', 'es']).default('en'),
    // LGPD / CCPA-style explicit opt-in for product updates and
    // marketing. Defaults to false; transactional emails (password
    // reset, trial-ending, delivery notifications) are NOT gated by
    // this — they ship regardless of the user's marketing
    // preference.
    marketingOptIn: z.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;

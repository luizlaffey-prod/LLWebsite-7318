import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET!,
  user: {
    additionalFields: {
      radioName: { type: 'string', required: false, input: true },
      locale: { type: 'string', required: false, input: true, defaultValue: 'en' },
      timezone: { type: 'string', required: false, defaultValue: 'UTC' },
      plan: { type: 'string', required: false, defaultValue: 'trial' },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

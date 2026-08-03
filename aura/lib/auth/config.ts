import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { TRIAL_DAYS } from '@/lib/billing/plans';
import { getTrustedOrigins } from '@/lib/auth/trusted-origins';

/**
 * Returns whether Google OAuth is plumbed in. Used by the auth UI to
 * conditionally render the "Continue with Google" button — clicking
 * it would 500 if the env vars aren't set, so we hide it instead.
 */
export function isGoogleAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

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
    // Better Auth calls this when the client invokes
    // authClient.forgetPassword({ email, redirectTo }). It mints a
    // single-use token under the hood and hands us the ready-to-use
    // URL. We render the AURA-branded email and ship via Resend.
    // When RESEND_API_KEY isn't set, sendResetPasswordEmail throws and
    // the request 500s — same behaviour as transactional sends today.
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: {
        email: string;
        name?: string | null;
        radioName?: string | null;
        locale?: 'en' | 'pt' | 'es' | null;
      };
      url: string;
    }) => {
      const { sendResetPasswordEmail } = await import('@/lib/email/send');
      await sendResetPasswordEmail({
        to: user.email,
        radioName: user.radioName ?? user.name ?? '',
        locale: (user.locale ?? 'en') as 'en' | 'pt' | 'es',
        resetUrl: url,
      });
    },
  },
  // Stamp every new user with a trial window. trialEndsAt is
  // nullable in the schema and nothing else was setting it on signup,
  // so dashboards rendered "0 days left" the moment an account was
  // created. The hook runs inside the same transaction as the user
  // insert so it can't leave half-baked rows. Window length comes
  // from TRIAL_DAYS (14) — was hardcoded to 7 which no longer matched
  // the plans config after the trial was extended.
  databaseHooks: {
    user: {
      create: {
        before: async (data: Record<string, unknown>) => ({
          data: {
            ...data,
            trialEndsAt:
              (data.trialEndsAt as Date | null | undefined) ??
              new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          },
        }),
      },
    },
  },
  // Conditionally register Google so betterAuth doesn't try to bind a
  // provider with empty credentials on deploys that haven't set them
  // yet. The auth callback path is /api/auth/callback/google by
  // convention — register that exact URI in the Google Cloud Console
  // OAuth consent screen.
  ...(isGoogleAuthConfigured()
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        },
      }
    : {}),
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  trustedOrigins: getTrustedOrigins(),
  secret: process.env.BETTER_AUTH_SECRET!,
  user: {
    additionalFields: {
      radioName: { type: 'string', required: false, input: true },
      locale: { type: 'string', required: false, input: true, defaultValue: 'en' },
      timezone: { type: 'string', required: false, defaultValue: 'UTC' },
      plan: { type: 'string', required: false, defaultValue: 'trial' },
      // emailNotifications carries the marketing opt-in choice from
      // the signup form. Defaults to false so silence is consent:
      // operators only get product / marketing email when they
      // explicitly check the box. Transactional sends (reset,
      // trial-ending) are not gated by this column.
      emailNotifications: {
        type: 'boolean',
        required: false,
        input: true,
        defaultValue: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

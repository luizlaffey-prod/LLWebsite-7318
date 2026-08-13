import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  // When no explicit production URL is configured, Better Auth uses the
  // current origin. This keeps Vercel preview deployments on their own host
  // instead of incorrectly sending sign-in requests to localhost.
  baseURL: process.env.NEXT_PUBLIC_APP_URL || undefined,
});

export const { signIn, signUp, signOut, useSession } = authClient;

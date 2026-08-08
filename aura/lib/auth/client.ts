import { createAuthClient } from 'better-auth/react';

// Let Better Auth resolve the current browser origin. A build-time absolute
// URL breaks Vercel previews because their login form would post to production
// or, when the variable is absent, to an operator's localhost.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;

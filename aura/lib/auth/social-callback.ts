import { safeCallbackPath } from '@/lib/auth/callback-url';

/**
 * Resolves the Better Auth social (Google) callback URL. When the user is in a
 * flow that set a validated internal `callbackURL` (e.g. Studio Pro sign-in),
 * Google must return them there — otherwise the desktop loopback never gets
 * its `code`+`state`. Falls back to the dashboard outside such a flow. The
 * value is re-validated as an internal path so it can never become an open
 * redirect.
 */
export function resolveSocialCallbackURL(
  callbackURL: string | null | undefined,
  locale: string
): string {
  return safeCallbackPath(callbackURL) ?? `/${locale}/dashboard`;
}

import 'server-only';
import { getSession } from './server';
import type { Session } from './config';

/**
 * Operator-only access gate. The list of admin emails lives in the
 * ADMIN_EMAILS env var (comma-separated). Used by routes that surface
 * deployment state — integration health, seed/migrate scripts, etc. —
 * that customers should not see.
 */
function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = adminEmails();
  if (list.length === 0) return false;
  return list.includes(email.toLowerCase());
}

export function isAdminSession(session: Session | null): boolean {
  return isAdminEmail(session?.user?.email);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const session = await getSession();
  return isAdminSession(session);
}

import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET: return the caller's current RSS feed token, generating one lazily
 * on first access. Idempotent — repeated calls return the same value
 * until POST rotates it.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [u] = await db
    .select({ feedToken: user.feedToken })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (u?.feedToken) {
    return NextResponse.json({ token: u.feedToken });
  }

  const token = randomBytes(32).toString('hex');
  await db
    .update(user)
    .set({ feedToken: token, updatedAt: new Date() })
    .where(eq(user.id, session.user.id));

  return NextResponse.json({ token });
}

/**
 * POST: rotate the token. Invalidates every external subscriber — the
 * radio station has to be told the new URL. Use when a token leaks or
 * a station relationship ends.
 */
export async function POST() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = randomBytes(32).toString('hex');
  await db
    .update(user)
    .set({ feedToken: token, updatedAt: new Date() })
    .where(eq(user.id, session.user.id));

  return NextResponse.json({ token });
}

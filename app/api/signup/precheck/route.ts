import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { signupAttempt } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Three trial accounts per IP every 30 days. Generous enough that a
// small radio station / office doesn't get blocked by a sibling
// signing up later in the month, tight enough that anyone trying to
// stretch the 7-day trial by spinning up disposable emails hits a
// wall after attempt #3.
const MAX_SIGNUPS_PER_IP = 3;
const WINDOW_DAYS = 30;

/**
 * Pre-check called by the signup form before hitting better-auth's
 * /api/auth/sign-up/email. Returns `{ allowed: false }` when the
 * caller's IP has already created MAX_SIGNUPS_PER_IP accounts inside
 * the rolling WINDOW_DAYS — the form surfaces the friendly message.
 *
 * Side effect: when the check passes, the attempt is recorded
 * immediately. We bill the attempt rather than the success because
 * a determined abuser could otherwise keep trying invalid passwords
 * until they crafted a successful payload, with no penalty per try.
 *
 * The IP is hashed with a project-wide secret before persistence —
 * the IP itself is never stored in plaintext, only the digest.
 */
export async function POST(req: Request) {
  const ip = extractClientIp(req);
  const ipHash = hashIp(ip);

  const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(signupAttempt)
    .where(
      and(eq(signupAttempt.ipHash, ipHash), gte(signupAttempt.createdAt, cutoff))
    );

  const count = Number(row?.count ?? 0);
  if (count >= MAX_SIGNUPS_PER_IP) {
    return NextResponse.json(
      {
        allowed: false,
        reason: 'ip_signup_limit',
        limit: MAX_SIGNUPS_PER_IP,
        windowDays: WINDOW_DAYS,
      },
      { status: 429 }
    );
  }

  await db.insert(signupAttempt).values({ ipHash });

  return NextResponse.json({ allowed: true });
}

function extractClientIp(req: Request): string {
  // Vercel sets x-forwarded-for as a comma-separated list, leftmost
  // value is the original client. Other proxies use x-real-ip.
  // Fall back to a generic bucket so local-dev / unknown sources
  // are still throttled together.
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

function hashIp(ip: string): string {
  // Salted hash so a leaked DB doesn't expose user IPs even by
  // rainbow-table. The salt comes from BETTER_AUTH_SECRET because
  // that's already configured everywhere this app runs — no new env
  // var to provision.
  const salt = process.env.BETTER_AUTH_SECRET ?? 'aura-signup-salt';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

import { NextResponse } from 'next/server';
import { and, eq, gte, lte, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { sendTrialEndingEmail } from '@/lib/email/send';
import { requireCronAuth } from '@/lib/cron/guard';
import type { Locale } from '@/i18n';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Daily cron: warns users whose trial ends within the next 24 hours.
 * Idempotent-ish — runs once a day; users in the window get exactly one email.
 */
export async function GET(req: Request) {
  const auth = requireCronAuth(req);
  if (auth) return auth;

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const candidates = await db
    .select({
      id: user.id,
      email: user.email,
      radioName: user.radioName,
      locale: user.locale,
    })
    .from(user)
    .where(
      and(
        eq(user.plan, 'trial'),
        isNotNull(user.trialEndsAt),
        gte(user.trialEndsAt, now),
        lte(user.trialEndsAt, in24h)
      )
    );

  const results: { userId: string; ok: boolean; error?: string }[] = [];

  for (const u of candidates) {
    try {
      await sendTrialEndingEmail({
        to: u.email,
        radioName: u.radioName ?? '',
        locale: (u.locale ?? 'en') as Locale,
      });
      results.push({ userId: u.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      console.error('[cron/trial-warning] failed', u.id, message);
      results.push({ userId: u.id, ok: false, error: message });
    }
  }

  return NextResponse.json({ ran: true, count: candidates.length, results });
}

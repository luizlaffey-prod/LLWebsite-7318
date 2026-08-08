import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { user, usagePeriod } from '@/lib/db/schema';
import {
  quotaSnapshotForAccount,
  type QuotaSnapshot,
} from './quota-policy';

export { effectiveTier } from './quota-policy';
export type { QuotaSnapshot } from './quota-policy';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function unmeteredGenerationEmails(): Set<string> {
  return new Set(
    (process.env.UNMETERED_GENERATION_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function getQuota(userId: string): Promise<QuotaSnapshot> {
  const dbUser = (
    await db
      .select({ email: user.email, plan: user.plan })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
  )[0];
  const today = startOfDay(new Date());

  const period = (
    await db
      .select()
      .from(usagePeriod)
      .where(and(eq(usagePeriod.userId, userId), gte(usagePeriod.periodStart, today)))
      .limit(1)
  )[0];

  const used = period?.bulletinsUsed ?? 0;
  return quotaSnapshotForAccount({
    plan: dbUser?.plan,
    used,
    unlimited:
      Boolean(dbUser?.email) &&
      unmeteredGenerationEmails().has(dbUser!.email.toLowerCase()),
  });
}

export async function incrementUsage(userId: string): Promise<QuotaSnapshot> {
  const current = await getQuota(userId);
  if (current.unlimited) return current;

  const { tier, limit } = current;
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + DAY_MS);

  const existing = (
    await db
      .select()
      .from(usagePeriod)
      .where(and(eq(usagePeriod.userId, userId), gte(usagePeriod.periodStart, today)))
      .limit(1)
  )[0];

  let nextUsed: number;
  if (existing) {
    nextUsed = existing.bulletinsUsed + 1;
    await db
      .update(usagePeriod)
      .set({ bulletinsUsed: nextUsed })
      .where(eq(usagePeriod.id, existing.id));
  } else {
    nextUsed = 1;
    await db.insert(usagePeriod).values({
      userId,
      periodStart: today,
      periodEnd: tomorrow,
      bulletinsUsed: 1,
      bulletinsLimit: limit,
    });
  }
  return {
    tier,
    used: nextUsed,
    limit,
    remaining: Math.max(0, limit - nextUsed),
    unlimited: false,
  };
}

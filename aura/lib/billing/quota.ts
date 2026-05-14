import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { user, usagePeriod } from '@/lib/db/schema';
import { PLANS, TRIAL_TIER, type PlanTier } from './plans';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/** Effective tier for quota purposes — trial gets Pro limits. */
export function effectiveTier(plan: string | null | undefined): PlanTier {
  if (plan === 'trial') return TRIAL_TIER;
  if (plan === 'starter' || plan === 'standard' || plan === 'pro') return plan;
  return 'starter';
}

export interface QuotaSnapshot {
  tier: PlanTier;
  used: number;
  limit: number;
  remaining: number;
}

export async function getQuota(userId: string): Promise<QuotaSnapshot> {
  const dbUser = (
    await db.select().from(user).where(eq(user.id, userId)).limit(1)
  )[0];
  const tier = effectiveTier(dbUser?.plan);
  const limit = PLANS[tier].bulletinsPerDay;
  const today = startOfDay(new Date());

  const period = (
    await db
      .select()
      .from(usagePeriod)
      .where(and(eq(usagePeriod.userId, userId), gte(usagePeriod.periodStart, today)))
      .limit(1)
  )[0];

  const used = period?.bulletinsUsed ?? 0;
  return { tier, used, limit, remaining: Math.max(0, limit - used) };
}

export async function incrementUsage(userId: string): Promise<QuotaSnapshot> {
  const { tier, limit } = await getQuota(userId);
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
  return { tier, used: nextUsed, limit, remaining: Math.max(0, limit - nextUsed) };
}

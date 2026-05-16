import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { monthlyMusicUsage, user } from '@/lib/db/schema';
import { PLANS, type PlanTier } from './plans';
import { effectiveTier } from './quota';

export const MUSIC_TRACK_OVERAGE_CENTS = 75;

function startOfMonth(d: Date): Date {
  const x = new Date(d);
  x.setUTCDate(1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfMonth(d: Date): Date {
  const x = startOfMonth(d);
  x.setUTCMonth(x.getUTCMonth() + 1);
  return x;
}

/**
 * Lazily creates the monthly_music_usage table. Mirrors the voice-catalog
 * bootstrap pattern — keeps callers from having to wait for a drizzle-kit
 * migrate step on the deployed environment.
 */
async function ensureTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "monthly_music_usage" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "period_start" timestamp with time zone NOT NULL,
      "period_end" timestamp with time zone NOT NULL,
      "tracks_used" integer DEFAULT 0 NOT NULL,
      "tracks_limit" integer NOT NULL,
      "overage_count" integer DEFAULT 0 NOT NULL,
      "overage_amount_cents" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "music_usage_user_period_idx"
      ON "monthly_music_usage" ("user_id", "period_start")
  `);
}

export interface MusicQuotaSnapshot {
  tier: PlanTier;
  used: number;
  limit: number;
  remaining: number;
}

export async function getMusicQuota(userId: string): Promise<MusicQuotaSnapshot> {
  await ensureTable();

  const dbUser = (
    await db.select().from(user).where(eq(user.id, userId)).limit(1)
  )[0];
  const tier = effectiveTier(dbUser?.plan);
  const limit = PLANS[tier].musicTracksPerMonth;
  const periodStart = startOfMonth(new Date());

  const period = (
    await db
      .select()
      .from(monthlyMusicUsage)
      .where(
        and(
          eq(monthlyMusicUsage.userId, userId),
          gte(monthlyMusicUsage.periodStart, periodStart)
        )
      )
      .limit(1)
  )[0];

  const used = period?.tracksUsed ?? 0;
  return { tier, used, limit, remaining: Math.max(0, limit - used) };
}

export async function incrementMusicUsage(userId: string): Promise<MusicQuotaSnapshot> {
  await ensureTable();
  const { tier, limit } = await getMusicQuota(userId);
  const periodStart = startOfMonth(new Date());
  const periodEnd = endOfMonth(new Date());

  const existing = (
    await db
      .select()
      .from(monthlyMusicUsage)
      .where(
        and(
          eq(monthlyMusicUsage.userId, userId),
          gte(monthlyMusicUsage.periodStart, periodStart)
        )
      )
      .limit(1)
  )[0];

  let nextUsed: number;
  if (existing) {
    nextUsed = existing.tracksUsed + 1;
    await db
      .update(monthlyMusicUsage)
      .set({ tracksUsed: nextUsed })
      .where(eq(monthlyMusicUsage.id, existing.id));
  } else {
    nextUsed = 1;
    await db.insert(monthlyMusicUsage).values({
      userId,
      periodStart,
      periodEnd,
      tracksUsed: 1,
      tracksLimit: limit,
    });
  }
  return { tier, used: nextUsed, limit, remaining: Math.max(0, limit - nextUsed) };
}

export async function recordMusicOverage(userId: string): Promise<void> {
  await ensureTable();
  const periodStart = startOfMonth(new Date());
  const periodEnd = endOfMonth(new Date());

  const existing = (
    await db
      .select()
      .from(monthlyMusicUsage)
      .where(
        and(
          eq(monthlyMusicUsage.userId, userId),
          gte(monthlyMusicUsage.periodStart, periodStart)
        )
      )
      .limit(1)
  )[0];

  if (existing) {
    await db
      .update(monthlyMusicUsage)
      .set({
        overageCount: existing.overageCount + 1,
        overageAmountCents: existing.overageAmountCents + MUSIC_TRACK_OVERAGE_CENTS,
      })
      .where(eq(monthlyMusicUsage.id, existing.id));
  } else {
    await db.insert(monthlyMusicUsage).values({
      userId,
      periodStart,
      periodEnd,
      tracksUsed: 0,
      tracksLimit: 0,
      overageCount: 1,
      overageAmountCents: MUSIC_TRACK_OVERAGE_CENTS,
    });
  }
}

import { and, eq, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron/guard';
import { db } from '@/lib/db/client';
import {
  studioLicenseChallenge,
  studioLicenseLease,
  studioOutputLease,
} from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const now = new Date();
  const [challenges, outputs, leases] = await Promise.all([
    db
      .delete(studioLicenseChallenge)
      .where(lte(studioLicenseChallenge.expiresAt, now))
      .returning({ id: studioLicenseChallenge.id }),
    db
      .delete(studioOutputLease)
      .where(lte(studioOutputLease.expiresAt, now))
      .returning({ id: studioOutputLease.id }),
    db
      .update(studioLicenseLease)
      .set({ status: 'expired', updatedAt: now })
      .where(
        and(
          eq(studioLicenseLease.status, 'active'),
          lte(studioLicenseLease.offlineGraceUntil, now)
        )
      )
      .returning({ id: studioLicenseLease.id }),
  ]);

  return NextResponse.json({
    cleanedAt: now.toISOString(),
    deletedChallenges: challenges.length,
    deletedOutputSlots: outputs.length,
    expiredLicenseLeases: leases.length,
  });
}

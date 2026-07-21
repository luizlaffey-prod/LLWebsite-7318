import { and, eq, isNotNull, lte, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron/guard';
import { db } from '@/lib/db/client';
import {
  devicePairingCode,
  devicePairingRateLimit,
  studioLicenseChallenge,
  studioLicenseLease,
  studioOutputLease,
} from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const now = new Date();
  const staleRateLimitCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [pairingCodes, rateLimitBuckets, challenges, outputs, leases] =
    await Promise.all([
      db
        .delete(devicePairingCode)
        .where(
          or(
            lte(devicePairingCode.expiresAt, now),
            isNotNull(devicePairingCode.consumedAt)
          )
        )
        .returning({ id: devicePairingCode.id }),
      db
        .delete(devicePairingRateLimit)
        .where(lte(devicePairingRateLimit.updatedAt, staleRateLimitCutoff))
        .returning({ bucketKey: devicePairingRateLimit.bucketKey }),
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
    deletedPairingCodes: pairingCodes.length,
    deletedPairingRateLimitBuckets: rateLimitBuckets.length,
    deletedChallenges: challenges.length,
    deletedOutputSlots: outputs.length,
    expiredLicenseLeases: leases.length,
  });
}

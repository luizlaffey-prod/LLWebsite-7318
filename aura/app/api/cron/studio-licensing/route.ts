import { and, eq, isNotNull, lte, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron/guard';
import { db } from '@/lib/db/client';
import {
  devicePairingCode,
  devicePairingRateLimit,
  rateLimit,
  studioAuthGrant,
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
  const [
    pairingCodes,
    pairingRateLimitBuckets,
    challenges,
    outputs,
    leases,
    authGrants,
    rateRows,
  ] = await Promise.all([
    // Expired or consumed pairing codes.
    db
      .delete(devicePairingCode)
      .where(
        or(
          lte(devicePairingCode.expiresAt, now),
          isNotNull(devicePairingCode.consumedAt)
        )
      )
      .returning({ id: devicePairingCode.id }),
    // Stale pairing-exchange rate-limit buckets.
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
    // Expired single-use authorization grants (in-app login).
    db
      .delete(studioAuthGrant)
      .where(lte(studioAuthGrant.expiresAt, now))
      .returning({ id: studioAuthGrant.id }),
    // Stale generic fixed-window rate-limit rows (auth routes).
    db
      .delete(rateLimit)
      .where(lte(rateLimit.expiresAt, now))
      .returning({ bucket: rateLimit.bucket }),
  ]);

  return NextResponse.json({
    cleanedAt: now.toISOString(),
    deletedPairingCodes: pairingCodes.length,
    deletedPairingRateLimitBuckets: pairingRateLimitBuckets.length,
    deletedChallenges: challenges.length,
    deletedOutputSlots: outputs.length,
    expiredLicenseLeases: leases.length,
    deletedAuthGrants: authGrants.length,
    deletedRateLimitRows: rateRows.length,
  });
}

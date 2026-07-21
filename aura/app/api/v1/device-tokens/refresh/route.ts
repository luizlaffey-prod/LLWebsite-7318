import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { stationDevice } from '@/lib/db/schema';
import { RefreshTokenSchema } from '@/lib/integration/contracts';
import {
  hashDeviceToken,
  isRefreshToken,
  issueDeviceCredentials,
} from '@/lib/integration/device-credentials';
import {
  refreshProofMessage,
  verifyDeviceSignature,
} from '@/lib/integration/license-crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = RefreshTokenSchema.safeParse(body);
  if (!parsed.success || !isRefreshToken(parsed.data.refreshToken)) {
    return Response.json({ error: 'invalid_refresh_token' }, { status: 401 });
  }

  const now = new Date();
  const currentHash = hashDeviceToken(parsed.data.refreshToken);
  const [currentDevice] = await db
    .select({
      id: stationDevice.id,
      publicKey: stationDevice.devicePublicKey,
    })
    .from(stationDevice)
    .where(
      and(
        eq(stationDevice.refreshTokenHash, currentHash),
        eq(stationDevice.status, 'active'),
        gt(stationDevice.refreshTokenExpiresAt, now)
      )
    )
    .limit(1);
  if (
    !currentDevice ||
    !verifyDeviceSignature({
      publicKeyBase64: currentDevice.publicKey,
      message: refreshProofMessage({
        deviceId: currentDevice.id,
        refreshToken: parsed.data.refreshToken,
      }),
      signature: parsed.data.refreshProof,
    })
  ) {
    return Response.json({ error: 'invalid_refresh_proof' }, { status: 401 });
  }
  const next = issueDeviceCredentials(now);
  const [device] = await db
    .update(stationDevice)
    .set({
      accessTokenHash: next.accessTokenHash,
      accessTokenPrefix: next.accessTokenPrefix,
      accessTokenExpiresAt: next.accessTokenExpiresAt,
      refreshTokenHash: next.refreshTokenHash,
      refreshTokenExpiresAt: next.refreshTokenExpiresAt,
      lastSeenAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(stationDevice.refreshTokenHash, currentHash),
        eq(stationDevice.status, 'active'),
        gt(stationDevice.refreshTokenExpiresAt, now)
      )
    )
    .returning({ id: stationDevice.id });

  if (!device) {
    return Response.json({ error: 'invalid_or_expired_refresh_token' }, { status: 401 });
  }

  return Response.json(
    {
      tokenType: 'Bearer',
      accessToken: next.accessToken,
      accessTokenExpiresAt: next.accessTokenExpiresAt.toISOString(),
      refreshToken: next.refreshToken,
      refreshTokenExpiresAt: next.refreshTokenExpiresAt.toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

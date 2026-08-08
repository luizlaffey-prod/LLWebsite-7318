import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { stationDevice } from '@/lib/db/schema';
import {
  integrationErrorResponse,
  requireStationMember,
} from '@/lib/integration/authorization';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ stationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    const { stationId } = await ctx.params;
    await requireStationMember(stationId, session.user.id, ['owner', 'admin']);
    const rows = await db
      .select({
        id: stationDevice.id,
        name: stationDevice.name,
        platform: stationDevice.platform,
        status: stationDevice.status,
        activationSlot: stationDevice.activationSlot,
        scopes: stationDevice.scopes,
        deviceKeyAlgorithm: stationDevice.deviceKeyAlgorithm,
        deviceKeyFingerprint: stationDevice.deviceKeyFingerprint,
        accessTokenPrefix: stationDevice.accessTokenPrefix,
        accessTokenExpiresAt: stationDevice.accessTokenExpiresAt,
        refreshTokenExpiresAt: stationDevice.refreshTokenExpiresAt,
        lastSeenAt: stationDevice.lastSeenAt,
        lastLicenseIssuedAt: stationDevice.lastLicenseIssuedAt,
        revokedAt: stationDevice.revokedAt,
        createdAt: stationDevice.createdAt,
      })
      .from(stationDevice)
      .where(eq(stationDevice.stationId, stationId));
    return Response.json({ devices: rows });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

import { and, desc, eq, gt } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import {
  stationDevice,
  studioLicenseEvent,
  studioOutputLease,
} from '@/lib/db/schema';
import {
  integrationErrorResponse,
  requireStationMember,
} from '@/lib/integration/authorization';
import {
  ensureStudioEntitlement,
  entitlementResource,
} from '@/lib/integration/licensing';

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
    const member = await requireStationMember(stationId, session.user.id, [
      'owner',
      'admin',
    ]);
    const now = new Date();
    const [entitlement, devices, outputs, events] = await Promise.all([
      ensureStudioEntitlement(member.organization.id, now),
      db
        .select({ id: stationDevice.id })
        .from(stationDevice)
        .where(
          and(
            eq(stationDevice.stationId, stationId),
            eq(stationDevice.status, 'active')
          )
        ),
      db
        .select({
          slot: studioOutputLease.slot,
          deviceId: studioOutputLease.deviceId,
          sessionId: studioOutputLease.sessionId,
          outputId: studioOutputLease.outputId,
          expiresAt: studioOutputLease.expiresAt,
        })
        .from(studioOutputLease)
        .where(
          and(
            eq(studioOutputLease.stationId, stationId),
            gt(studioOutputLease.expiresAt, now)
          )
        ),
      db
        .select({
          id: studioLicenseEvent.id,
          deviceId: studioLicenseEvent.deviceId,
          type: studioLicenseEvent.type,
          payload: studioLicenseEvent.payload,
          createdAt: studioLicenseEvent.createdAt,
        })
        .from(studioLicenseEvent)
        .where(eq(studioLicenseEvent.stationId, stationId))
        .orderBy(desc(studioLicenseEvent.createdAt))
        .limit(20),
    ]);

    return Response.json({
      entitlement: entitlementResource(entitlement),
      usage: {
        activeDevices: devices.length,
        activeOutputs: outputs.length,
      },
      outputs,
      recentEvents: events,
      serverTime: now.toISOString(),
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

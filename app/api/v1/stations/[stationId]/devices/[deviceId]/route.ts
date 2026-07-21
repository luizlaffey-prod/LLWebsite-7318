import { getSession } from '@/lib/auth/server';
import {
  assertUuidParam,
  integrationErrorResponse,
  requireStationMember,
} from '@/lib/integration/authorization';
import { revokeDeviceLicensing } from '@/lib/integration/licensing';

export const runtime = 'nodejs';

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ stationId: string; deviceId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    const { stationId, deviceId } = await ctx.params;
    assertUuidParam(deviceId, 'invalid_device_id');
    const member = await requireStationMember(stationId, session.user.id, [
      'owner',
      'admin',
    ]);
    await revokeDeviceLicensing({
      organizationId: member.organization.id,
      stationId,
      deviceId,
      reason: `admin:${session.user.id}`,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

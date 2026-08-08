import {
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';
import {
  currentDeviceLease,
  ensureStudioEntitlement,
  entitlementResource,
} from '@/lib/integration/licensing';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const context = await authenticateDevice(req, undefined, 'station:read');
    const [entitlement, lease] = await Promise.all([
      ensureStudioEntitlement(context.organization.id),
      currentDeviceLease(context.device.id),
    ]);
    return Response.json(
      {
        entitlement: entitlementResource(entitlement),
        device: {
          id: context.device.id,
          activationSlot: context.device.activationSlot,
          keyFingerprint: context.device.deviceKeyFingerprint,
          lastLicenseIssuedAt:
            context.device.lastLicenseIssuedAt?.toISOString() ?? null,
        },
        latestLease: lease
          ? {
              id: lease.id,
              status: lease.status,
              keyId: lease.keyId,
              planCode: lease.planCode,
              onlineExpiresAt: lease.onlineExpiresAt.toISOString(),
              offlineGraceUntil: lease.offlineGraceUntil.toISOString(),
              createdAt: lease.createdAt.toISOString(),
            }
          : null,
        serverTime: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

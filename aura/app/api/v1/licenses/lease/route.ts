import {
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';
import {
  LicenseLeaseRequestSchema,
  payloadFingerprint,
} from '@/lib/integration/contracts';
import {
  consumeDeviceProof,
  issueStudioLicense,
  requireUsableStudioEntitlement,
} from '@/lib/integration/licensing';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const context = await authenticateDevice(req, undefined, 'station:read');
    const body = await req.json().catch(() => ({}));
    const parsed = LicenseLeaseRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const signedPayload = {
      appVersion: parsed.data.appVersion,
      buildChannel: parsed.data.buildChannel,
      clientTime: parsed.data.clientTime ?? null,
    };
    await consumeDeviceProof({
      context,
      purpose: 'lease',
      ...parsed.data.proof,
      payloadHash: payloadFingerprint(signedPayload),
    });
    const entitlement = await requireUsableStudioEntitlement(
      context.organization.id
    );
    const license = await issueStudioLicense({
      context,
      entitlement,
      appVersion: parsed.data.appVersion,
      buildChannel: parsed.data.buildChannel,
    });

    const clientTime = parsed.data.clientTime
      ? new Date(parsed.data.clientTime).getTime()
      : null;
    return Response.json(
      {
        licenseToken: license.token,
        keyId: license.keyId,
        leaseId: license.claims.jti,
        onlineExpiresAt: new Date(license.claims.exp * 1000).toISOString(),
        offlineGraceUntil: new Date(
          license.claims.offlineGraceUntil * 1000
        ).toISOString(),
        serverTime: new Date(license.claims.serverTime * 1000).toISOString(),
        clockSkewSeconds:
          clientTime === null
            ? null
            : Math.round((license.claims.serverTime * 1000 - clientTime) / 1000),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

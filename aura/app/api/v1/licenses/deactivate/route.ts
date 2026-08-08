import {
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';
import {
  LicenseDeactivateRequestSchema,
  payloadFingerprint,
} from '@/lib/integration/contracts';
import {
  consumeDeviceProof,
  revokeDeviceLicensing,
} from '@/lib/integration/licensing';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const context = await authenticateDevice(req, undefined, 'station:read');
    const body = await req.json().catch(() => ({}));
    const parsed = LicenseDeactivateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const signedPayload = { reason: parsed.data.reason };
    await consumeDeviceProof({
      context,
      purpose: 'deactivate',
      ...parsed.data.proof,
      payloadHash: payloadFingerprint(signedPayload),
    });
    await revokeDeviceLicensing({
      organizationId: context.organization.id,
      stationId: context.station.id,
      deviceId: context.device.id,
      reason: parsed.data.reason,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

import {
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';
import {
  LicenseHeartbeatRequestSchema,
  payloadFingerprint,
} from '@/lib/integration/contracts';
import {
  acquireOutputLease,
  consumeDeviceProof,
  releaseOutputLease,
  requireCurrentLicenseLease,
  requireUsableStudioEntitlement,
} from '@/lib/integration/licensing';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const context = await authenticateDevice(req, undefined, 'station:read');
    const body = await req.json().catch(() => ({}));
    const parsed = LicenseHeartbeatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const signedPayload = {
      leaseId: parsed.data.leaseId,
      sessionId: parsed.data.sessionId,
      outputId: parsed.data.outputId,
      state: parsed.data.state,
      appVersion: parsed.data.appVersion,
      clientTime: parsed.data.clientTime ?? null,
    };
    await consumeDeviceProof({
      context,
      purpose: 'heartbeat',
      ...parsed.data.proof,
      payloadHash: payloadFingerprint(signedPayload),
    });
    await requireCurrentLicenseLease(context.device.id, parsed.data.leaseId);
    const entitlement = await requireUsableStudioEntitlement(
      context.organization.id
    );

    if (parsed.data.state !== 'on_air') {
      await releaseOutputLease(context.device.id, parsed.data.sessionId);
      return Response.json({
        allowed: true,
        state: parsed.data.state,
        serverTime: new Date().toISOString(),
        nextHeartbeatInSeconds: null,
        outputLeaseExpiresAt: null,
      });
    }

    const outputLease = await acquireOutputLease({
      context,
      licenseLeaseId: parsed.data.leaseId,
      sessionId: parsed.data.sessionId,
      outputId: parsed.data.outputId,
      appVersion: parsed.data.appVersion,
      maxConcurrentOutputs: entitlement.maxConcurrentOutputs,
    });
    return Response.json({
      allowed: true,
      state: 'on_air',
      slot: outputLease.slot,
      serverTime: new Date().toISOString(),
      nextHeartbeatInSeconds: 30,
      outputLeaseExpiresAt: outputLease.expiresAt.toISOString(),
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

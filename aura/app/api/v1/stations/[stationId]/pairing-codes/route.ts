import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { devicePairingCode, stationDevice } from '@/lib/db/schema';
import {
  DEFAULT_DEVICE_SCOPES,
  PairingCodeCreateSchema,
} from '@/lib/integration/contracts';
import {
  createPairingCode,
  hashPairingCode,
  PAIRING_CODE_TTL_MS,
} from '@/lib/integration/device-credentials';
import {
  integrationErrorResponse,
  requireStationMember,
} from '@/lib/integration/authorization';
import { requireUsableStudioEntitlement } from '@/lib/integration/licensing';
import { stationEligibleForPairing } from '@/lib/integration/studio-auth-policy';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
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
    const entitlement = await requireUsableStudioEntitlement(
      member.organization.id
    );
    // A station needs a default voice before pairing (same gate the OAuth
    // consent flow enforces) — server-side so the panel's disabled button
    // can't be bypassed.
    if (!stationEligibleForPairing(member.station)) {
      return Response.json({ error: 'no_default_voice' }, { status: 409 });
    }
    const activeDevices = await db
      .select({ id: stationDevice.id })
      .from(stationDevice)
      .where(
        and(
          eq(stationDevice.stationId, stationId),
          eq(stationDevice.status, 'active')
        )
      );
    if (activeDevices.length >= entitlement.maxDevicesPerStation) {
      return Response.json(
        {
          error: 'device_activation_limit_reached',
          limit: entitlement.maxDevicesPerStation,
        },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = PairingCodeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const code = createPairingCode();
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);
    const scopes = parsed.data.scopes ?? [...DEFAULT_DEVICE_SCOPES];

    await db.insert(devicePairingCode).values({
      stationId,
      requestedByUserId: session.user.id,
      codeHash: hashPairingCode(code),
      scopes,
      expiresAt,
    });

    return Response.json(
      {
        code,
        stationId,
        expiresAt: expiresAt.toISOString(),
        scopes,
      },
      {
        status: 201,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

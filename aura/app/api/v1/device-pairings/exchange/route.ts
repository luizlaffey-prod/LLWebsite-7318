import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { devicePairingCode, station, stationDevice } from '@/lib/db/schema';
import {
  integrationErrorResponse,
} from '@/lib/integration/authorization';
import { PairingExchangeSchema } from '@/lib/integration/contracts';
import {
  hashPairingCode,
  issueDeviceCredentials,
  normalizePairingCode,
} from '@/lib/integration/device-credentials';
import {
  deviceKeyFingerprint,
  pairingProofMessage,
  verifyDeviceSignature,
} from '@/lib/integration/license-crypto';
import { requireUsableStudioEntitlement } from '@/lib/integration/licensing';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = PairingExchangeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    let keyFingerprint: string;
    try {
      keyFingerprint = deviceKeyFingerprint(parsed.data.devicePublicKey);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'invalid_device_public_key' },
        { status: 400 }
      );
    }
    const pairingMessage = pairingProofMessage({
      code: normalizePairingCode(parsed.data.code),
      deviceName: parsed.data.deviceName,
      platform: parsed.data.platform,
      deviceKeyFingerprint: keyFingerprint,
    });
    if (
      !verifyDeviceSignature({
        publicKeyBase64: parsed.data.devicePublicKey,
        message: pairingMessage,
        signature: parsed.data.pairingProof,
      })
    ) {
      return Response.json({ error: 'invalid_pairing_proof' }, { status: 401 });
    }

    const now = new Date();
    const codeHash = hashPairingCode(parsed.data.code);
    const [pairing] = await db
      .select({ pairing: devicePairingCode, station })
      .from(devicePairingCode)
      .innerJoin(station, eq(station.id, devicePairingCode.stationId))
      .where(
        and(
          eq(devicePairingCode.codeHash, codeHash),
          isNull(devicePairingCode.consumedAt),
          gt(devicePairingCode.expiresAt, now),
          eq(station.enabled, true)
        )
      )
      .limit(1);

    if (!pairing) {
      return Response.json(
        { error: 'invalid_or_expired_pairing_code' },
        { status: 401 }
      );
    }

    const entitlement = await requireUsableStudioEntitlement(
      pairing.station.organizationId,
      now
    );
    const [existingKey] = await db
      .select({ id: stationDevice.id })
      .from(stationDevice)
      .where(
        and(
          eq(stationDevice.deviceKeyFingerprint, keyFingerprint),
          eq(stationDevice.status, 'active')
        )
      )
      .limit(1);
    if (existingKey) {
      return Response.json({ error: 'device_key_already_registered' }, { status: 409 });
    }

    const [claimed] = await db
      .update(devicePairingCode)
      .set({ consumedAt: now })
      .where(
        and(
          eq(devicePairingCode.id, pairing.pairing.id),
          isNull(devicePairingCode.consumedAt),
          gt(devicePairingCode.expiresAt, now)
        )
      )
      .returning({ id: devicePairingCode.id });

    if (!claimed) {
      return Response.json({ error: 'pairing_code_already_used' }, { status: 409 });
    }

    const credentials = issueDeviceCredentials(now);
    let device:
      | {
          id: string;
          name: string;
          platform: string;
          activationSlot: number | null;
          scopes: string[];
          deviceKeyFingerprint: string;
        }
      | undefined;

    for (let slot = 1; slot <= entitlement.maxDevicesPerStation; slot += 1) {
      [device] = await db
        .insert(stationDevice)
        .values({
          stationId: pairing.station.id,
          name: parsed.data.deviceName,
          platform: parsed.data.platform,
          activationSlot: slot,
          scopes: pairing.pairing.scopes,
          deviceKeyAlgorithm: parsed.data.deviceKeyAlgorithm,
          devicePublicKey: parsed.data.devicePublicKey,
          deviceKeyFingerprint: keyFingerprint,
          accessTokenHash: credentials.accessTokenHash,
          accessTokenPrefix: credentials.accessTokenPrefix,
          accessTokenExpiresAt: credentials.accessTokenExpiresAt,
          refreshTokenHash: credentials.refreshTokenHash,
          refreshTokenExpiresAt: credentials.refreshTokenExpiresAt,
          lastSeenAt: now,
        })
        .onConflictDoNothing()
        .returning({
          id: stationDevice.id,
          name: stationDevice.name,
          platform: stationDevice.platform,
          activationSlot: stationDevice.activationSlot,
          scopes: stationDevice.scopes,
          deviceKeyFingerprint: stationDevice.deviceKeyFingerprint,
        });
      if (device) break;
    }

    if (!device) {
      return Response.json(
        {
          error: 'device_activation_limit_reached',
          limit: entitlement.maxDevicesPerStation,
        },
        { status: 409 }
      );
    }

    return Response.json(
      {
        device,
        station: {
          id: pairing.station.id,
          name: pairing.station.name,
          timezone: pairing.station.timezone,
          defaultLanguage: pairing.station.defaultLanguage,
        },
        tokenType: 'Bearer',
        accessToken: credentials.accessToken,
        accessTokenExpiresAt: credentials.accessTokenExpiresAt.toISOString(),
        refreshToken: credentials.refreshToken,
        refreshTokenExpiresAt: credentials.refreshTokenExpiresAt.toISOString(),
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

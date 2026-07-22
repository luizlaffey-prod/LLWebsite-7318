import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { station, stationDevice } from '@/lib/db/schema';
import { integrationErrorResponse } from '@/lib/integration/authorization';
import { StudioTokenExchangeSchema } from '@/lib/integration/contracts';
import { issueDeviceCredentials } from '@/lib/integration/device-credentials';
import { verifyDeviceSignature } from '@/lib/integration/license-crypto';
import { requireUsableStudioEntitlement } from '@/lib/integration/licensing';
import {
  STUDIO_PRO_CLIENT_ID,
  studioAuthProofMessage,
  verifyPkceS256,
} from '@/lib/integration/studio-auth-policy';
import {
  consumeGrant,
  findActiveGrantByCode,
} from '@/lib/integration/studio-auth';
import {
  enforceRateLimit,
  rateLimitClientKey,
} from '@/lib/integration/rate-limit-store';

export const runtime = 'nodejs';

/**
 * OAuth token endpoint for the Studio Pro desktop client. Exchanges a
 * single-use authorization code (+ PKCE verifier + device proof) for the same
 * device credentials the pairing flow issues. Never accepts a password or a
 * client secret, and never returns a web session/cookie.
 */
export async function POST(req: Request) {
  try {
    // Public route — rate limit per client IP before doing any work.
    await enforceRateLimit({
      key: rateLimitClientKey(req, 'studio-auth-token'),
      limit: 30,
      windowMs: 60_000,
    });

    const body = await req.json().catch(() => ({}));
    const parsed = StudioTokenExchangeSchema.safeParse(body);
    if (!parsed.success) {
      return oauthError('invalid_request', 400, parsed.error.issues);
    }
    const input = parsed.data;

    if (input.client_id !== STUDIO_PRO_CLIENT_ID) {
      return oauthError('invalid_client', 401);
    }

    const now = new Date();
    const grant = await findActiveGrantByCode(input.code, now);
    // A missing/expired/consumed code, a client mismatch, or a redirect-URI
    // mismatch are all reported as invalid_grant to avoid leaking which.
    if (
      !grant ||
      grant.clientId !== input.client_id ||
      grant.redirectUri !== input.redirect_uri
    ) {
      return oauthError('invalid_grant', 400);
    }

    // PKCE: the verifier must hash to the challenge captured at authorize time.
    if (!verifyPkceS256(input.code_verifier, grant.pkceChallenge)) {
      return oauthError('invalid_grant', 400);
    }

    // Device proof: the caller must hold the private key for the public key
    // bound to the grant (preserves the existing P-256/ES256 possession check).
    const proofMessage = studioAuthProofMessage({
      clientId: grant.clientId,
      redirectUri: grant.redirectUri,
      code: input.code,
      deviceFingerprint: grant.deviceFingerprint,
    });
    if (
      !verifyDeviceSignature({
        publicKeyBase64: grant.devicePublicKey,
        message: proofMessage,
        signature: input.device_proof,
      })
    ) {
      return oauthError('invalid_grant', 400);
    }

    // Entitlement must be usable to register a device.
    const entitlement = await requireUsableStudioEntitlement(
      grant.organizationId,
      now
    );

    // Station must still exist and be enabled.
    const [stationRow] = await db
      .select({
        id: station.id,
        name: station.name,
        timezone: station.timezone,
        defaultLanguage: station.defaultLanguage,
        enabled: station.enabled,
      })
      .from(station)
      .where(eq(station.id, grant.stationId))
      .limit(1);
    if (!stationRow || !stationRow.enabled) {
      return oauthError('invalid_grant', 400);
    }

    // Reject a key that's already active (mirror the pairing flow).
    const [existingKey] = await db
      .select({ id: stationDevice.id })
      .from(stationDevice)
      .where(
        and(
          eq(stationDevice.deviceKeyFingerprint, grant.deviceFingerprint),
          eq(stationDevice.status, 'active')
        )
      )
      .limit(1);
    if (existingKey) {
      return oauthError('device_key_already_registered', 409);
    }

    // Atomically consume the code — first winner only; a replay gets false.
    const consumed = await consumeGrant(grant.id, now);
    if (!consumed) {
      return oauthError('invalid_grant', 400);
    }

    // Register the device into the first free activation slot.
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
          stationId: grant.stationId,
          name: grant.deviceName,
          platform: grant.devicePlatform,
          activationSlot: slot,
          scopes: grant.scopes,
          deviceKeyAlgorithm: grant.deviceKeyAlgorithm,
          devicePublicKey: grant.devicePublicKey,
          deviceKeyFingerprint: grant.deviceFingerprint,
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
      return oauthError('device_activation_limit_reached', 409, {
        limit: entitlement.maxDevicesPerStation,
      });
    }

    // Same PairingResponse shape as the code-pairing flow. No web session.
    return Response.json(
      {
        device,
        station: {
          id: stationRow.id,
          name: stationRow.name,
          timezone: stationRow.timezone,
          defaultLanguage: stationRow.defaultLanguage,
        },
        tokenType: 'Bearer',
        accessToken: credentials.accessToken,
        accessTokenExpiresAt: credentials.accessTokenExpiresAt.toISOString(),
        refreshToken: credentials.refreshToken,
        refreshTokenExpiresAt: credentials.refreshTokenExpiresAt.toISOString(),
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

function oauthError(error: string, status: number, extra?: unknown): Response {
  const body: Record<string, unknown> = { error };
  if (extra !== undefined) body.details = extra;
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

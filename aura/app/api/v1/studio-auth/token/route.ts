import { and, eq, sql } from 'drizzle-orm';
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
import { findActiveGrantByCode } from '@/lib/integration/studio-auth';
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

    // Consume the code AND register the device in ONE atomic statement.
    // neon-http has no interactive transactions, so this is a single CTE:
    // the grant is consumed only if it is still unconsumed AND a free
    // activation slot exists, and the device row is inserted in the same
    // statement. A concurrent replay finds the grant already consumed; any
    // failure (e.g. a slot unique-violation race) aborts the whole statement,
    // so the code is never burned without a device being created.
    const credentials = issueDeviceCredentials(now);
    const maxDevices = entitlement.maxDevicesPerStation;
    const result = await db.execute(sql`
      WITH g AS (
        SELECT station_id, device_name, device_platform, device_public_key,
               device_key_algorithm, device_fingerprint, scopes
        FROM studio_auth_grant
        WHERE id = ${grant.id} AND consumed_at IS NULL AND expires_at > ${now}
      ),
      slot AS (
        SELECT n FROM generate_series(1, ${maxDevices}) AS n
        WHERE NOT EXISTS (
          SELECT 1 FROM station_device d
          WHERE d.station_id = (SELECT station_id FROM g)
            AND d.activation_slot = n AND d.status = 'active'
        )
        ORDER BY n LIMIT 1
      ),
      consumed AS (
        UPDATE studio_auth_grant SET consumed_at = ${now}
        WHERE id = ${grant.id} AND consumed_at IS NULL AND expires_at > ${now}
          AND EXISTS (SELECT 1 FROM slot)
        RETURNING id
      ),
      ins AS (
        INSERT INTO station_device (
          station_id, name, platform, activation_slot, scopes,
          device_key_algorithm, device_public_key, device_key_fingerprint,
          access_token_hash, access_token_prefix, access_token_expires_at,
          refresh_token_hash, refresh_token_expires_at, last_seen_at
        )
        SELECT g.station_id, g.device_name, g.device_platform,
               (SELECT n FROM slot), g.scopes, g.device_key_algorithm,
               g.device_public_key, g.device_fingerprint,
               ${credentials.accessTokenHash}, ${credentials.accessTokenPrefix},
               ${credentials.accessTokenExpiresAt}, ${credentials.refreshTokenHash},
               ${credentials.refreshTokenExpiresAt}, ${now}
        FROM g
        WHERE EXISTS (SELECT 1 FROM consumed)
        RETURNING id, name, platform, activation_slot, scopes, device_key_fingerprint
      )
      SELECT id, name, platform, activation_slot, scopes, device_key_fingerprint FROM ins
    `);

    const rows = result.rows as Array<{
      id: string;
      name: string;
      platform: string;
      activation_slot: number | null;
      scopes: string[];
      device_key_fingerprint: string;
    }>;
    const r = rows[0] ?? null;

    if (!r) {
      // Nothing registered: either the code was already consumed/expired
      // (replay) or the station is at its device limit. Distinguish so the
      // desktop gets the right error.
      const active = await db
        .select({ id: stationDevice.id })
        .from(stationDevice)
        .where(
          and(
            eq(stationDevice.stationId, grant.stationId),
            eq(stationDevice.status, 'active')
          )
        );
      if (active.length >= maxDevices) {
        return oauthError('device_activation_limit_reached', 409, { limit: maxDevices });
      }
      return oauthError('invalid_grant', 400);
    }

    const device = {
      id: r.id,
      name: r.name,
      platform: r.platform,
      activationSlot: r.activation_slot,
      scopes: r.scopes,
      deviceKeyFingerprint: r.device_key_fingerprint,
    };

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

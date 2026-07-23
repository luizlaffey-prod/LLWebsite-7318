import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { studioAuthGrant, type StudioAuthGrant } from '@/lib/db/schema';
import { AUTH_CODE_TTL_MS } from '@/lib/integration/studio-auth-policy';
import { DEFAULT_DEVICE_SCOPES } from '@/lib/integration/contracts';

/**
 * Server-side helpers for Studio Pro authorization grants: minting the
 * single-use code, hashing it for storage, issuing a grant, and the atomic
 * lookup/consume used by the token endpoint. The plaintext code is returned
 * once (to redirect to the desktop) and never persisted.
 */

const AUTH_CODE_PREFIX = 'aura_ac_';

export function createAuthorizationCode(): string {
  return `${AUTH_CODE_PREFIX}${randomBytes(32).toString('base64url')}`;
}

/** Keyed hash of the authorization code (same secret family as device tokens). */
export function hashAuthorizationCode(code: string): string {
  const key =
    process.env.DEVICE_TOKEN_PEPPER ??
    process.env.SECRETS_KEY ??
    process.env.BETTER_AUTH_SECRET;
  if (!key) {
    throw new Error(
      'DEVICE_TOKEN_PEPPER, SECRETS_KEY or BETTER_AUTH_SECRET must be configured'
    );
  }
  return createHmac('sha256', key).update(`studio-auth-code:${code}`).digest('hex');
}

export interface IssueGrantInput {
  clientId: string;
  redirectUri: string;
  pkceChallenge: string;
  pkceMethod: string;
  userId: string;
  organizationId: string;
  stationId: string;
  deviceName: string;
  devicePlatform: string;
  devicePublicKey: string;
  deviceKeyAlgorithm: string;
  deviceFingerprint: string;
  scopes?: string[];
  now?: Date;
}

/** Creates a grant and returns the plaintext code (shown once, never stored). */
export async function issueStudioAuthGrant(
  input: IssueGrantInput
): Promise<{ code: string; expiresAt: Date }> {
  const now = input.now ?? new Date();
  const code = createAuthorizationCode();
  const expiresAt = new Date(now.getTime() + AUTH_CODE_TTL_MS);
  await db.insert(studioAuthGrant).values({
    codeHash: hashAuthorizationCode(code),
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    pkceChallenge: input.pkceChallenge,
    pkceMethod: input.pkceMethod,
    userId: input.userId,
    organizationId: input.organizationId,
    stationId: input.stationId,
    deviceName: input.deviceName,
    devicePlatform: input.devicePlatform,
    devicePublicKey: input.devicePublicKey,
    deviceKeyAlgorithm: input.deviceKeyAlgorithm,
    deviceFingerprint: input.deviceFingerprint,
    scopes: input.scopes ?? [...DEFAULT_DEVICE_SCOPES],
    expiresAt,
  });
  return { code, expiresAt };
}

/** Finds a live (unconsumed, unexpired) grant for a plaintext code. */
export async function findActiveGrantByCode(
  code: string,
  now = new Date()
): Promise<StudioAuthGrant | null> {
  const [grant] = await db
    .select()
    .from(studioAuthGrant)
    .where(
      and(
        eq(studioAuthGrant.codeHash, hashAuthorizationCode(code)),
        isNull(studioAuthGrant.consumedAt),
        gt(studioAuthGrant.expiresAt, now)
      )
    )
    .limit(1);
  return grant ?? null;
}

/**
 * Atomically consumes a grant. Returns true only for the first caller — a
 * replayed code finds `consumed_at` already set and gets false (409 upstream).
 */
export async function consumeGrant(grantId: string, now = new Date()): Promise<boolean> {
  const [claimed] = await db
    .update(studioAuthGrant)
    .set({ consumedAt: now })
    .where(
      and(
        eq(studioAuthGrant.id, grantId),
        isNull(studioAuthGrant.consumedAt),
        gt(studioAuthGrant.expiresAt, now)
      )
    )
    .returning({ id: studioAuthGrant.id });
  return Boolean(claimed);
}

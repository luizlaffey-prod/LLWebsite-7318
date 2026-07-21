import type { StudioEntitlement } from '@/lib/db/schema';
import type { StudioLicenseClaims } from '@/lib/integration/license-crypto';

export const STUDIO_TRIAL_DAYS = 14;
export const STUDIO_PAYMENT_GRACE_DAYS = 7;
export const LICENSE_ONLINE_TTL_MS = 24 * 60 * 60 * 1000;
export const LICENSE_OFFLINE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LICENSE_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const OUTPUT_HEARTBEAT_TTL_MS = 90 * 1000;

export const DEFAULT_STUDIO_FEATURES = [
  'core_playout',
  'aura_content',
  'signed_updates',
] as const;

export function entitlementUsableUntil(
  entitlement: Pick<StudioEntitlement, 'status' | 'validUntil' | 'graceUntil'>
): Date | null {
  if (entitlement.status === 'active') {
    return entitlement.validUntil ?? new Date('9999-12-31T23:59:59.999Z');
  }
  if (entitlement.status === 'trialing') return entitlement.validUntil;
  if (entitlement.status === 'grace') return entitlement.graceUntil;
  return null;
}

export function calculateLeaseWindow(
  entitlement: Pick<StudioEntitlement, 'status' | 'validUntil' | 'graceUntil'>,
  now = new Date()
): { onlineExpiresAt: Date; offlineGraceUntil: Date } | null {
  const usableUntil = entitlementUsableUntil(entitlement);
  if (!usableUntil || usableUntil <= now) return null;

  const offlineGraceUntil = new Date(
    Math.min(now.getTime() + LICENSE_OFFLINE_TTL_MS, usableUntil.getTime())
  );
  const onlineExpiresAt = new Date(
    Math.min(now.getTime() + LICENSE_ONLINE_TTL_MS, offlineGraceUntil.getTime())
  );
  return { onlineExpiresAt, offlineGraceUntil };
}

export function buildStudioLicenseClaims(input: {
  leaseId: string;
  organizationId: string;
  stationId: string;
  deviceId: string;
  deviceKeyFingerprint: string;
  entitlement: Pick<
    StudioEntitlement,
    | 'planCode'
    | 'features'
    | 'maxDevicesPerStation'
    | 'maxConcurrentOutputs'
  >;
  onlineExpiresAt: Date;
  offlineGraceUntil: Date;
  now?: Date;
}): StudioLicenseClaims {
  const now = input.now ?? new Date();
  return {
    iss: 'aura',
    aud: 'studio-pro',
    version: 1,
    jti: input.leaseId,
    organizationId: input.organizationId,
    stationId: input.stationId,
    deviceId: input.deviceId,
    deviceKeyFingerprint: input.deviceKeyFingerprint,
    planCode: input.entitlement.planCode,
    features: [...input.entitlement.features].sort(),
    maxDevices: input.entitlement.maxDevicesPerStation,
    maxConcurrentOutputs: input.entitlement.maxConcurrentOutputs,
    expirationMode: 'safe_restricted',
    serverTime: Math.floor(now.getTime() / 1000),
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(input.onlineExpiresAt.getTime() / 1000),
    offlineGraceUntil: Math.floor(input.offlineGraceUntil.getTime() / 1000),
  };
}

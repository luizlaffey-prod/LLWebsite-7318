import { randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, gt, isNull, lte, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  stationDevice,
  studioEntitlement,
  studioLicenseChallenge,
  studioLicenseEvent,
  studioLicenseLease,
  studioOutputLease,
  type StudioEntitlement,
  type StudioLicenseLease,
} from '@/lib/db/schema';
import { IntegrationHttpError } from '@/lib/integration/authorization';
import {
  challengeMatches,
  deviceProofMessage,
  sha256Hex,
  signStudioLicense,
  verifyDeviceSignature,
} from '@/lib/integration/license-crypto';
import {
  buildStudioLicenseClaims,
  calculateLeaseWindow,
  DEFAULT_STUDIO_FEATURES,
  entitlementUsableUntil,
  LICENSE_CHALLENGE_TTL_MS,
  OUTPUT_HEARTBEAT_TTL_MS,
  STUDIO_TRIAL_DAYS,
} from '@/lib/integration/license-policy';

type DeviceContext = {
  device: typeof stationDevice.$inferSelect;
  station: { id: string; organizationId: string };
  organization: { id: string };
};

export async function ensureStudioEntitlement(
  organizationId: string,
  now = new Date()
): Promise<StudioEntitlement> {
  const [existing] = await db
    .select()
    .from(studioEntitlement)
    .where(eq(studioEntitlement.organizationId, organizationId))
    .limit(1);
  if (existing) return existing;

  const validUntil = new Date(now.getTime() + STUDIO_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const [created] = await db
    .insert(studioEntitlement)
    .values({
      organizationId,
      status: 'trialing',
      planCode: 'trial',
      source: 'trial',
      features: [...DEFAULT_STUDIO_FEATURES],
      maxStations: 1,
      maxDevicesPerStation: 2,
      maxConcurrentOutputs: 1,
      validUntil,
    })
    .onConflictDoNothing({ target: studioEntitlement.organizationId })
    .returning();
  if (created) return created;

  const [raced] = await db
    .select()
    .from(studioEntitlement)
    .where(eq(studioEntitlement.organizationId, organizationId))
    .limit(1);
  if (!raced) throw new Error('studio_entitlement_creation_failed');
  return raced;
}

export async function requireUsableStudioEntitlement(
  organizationId: string,
  now = new Date()
): Promise<StudioEntitlement> {
  const entitlement = await ensureStudioEntitlement(organizationId, now);
  if (!calculateLeaseWindow(entitlement, now)) {
    throw new IntegrationHttpError(
      402,
      'studio_license_inactive',
      'The Studio Pro entitlement is inactive or outside its grace period.'
    );
  }
  return entitlement;
}

export async function requireStudioFeature(
  organizationId: string,
  feature: string,
  now = new Date()
): Promise<StudioEntitlement> {
  const entitlement = await requireUsableStudioEntitlement(organizationId, now);
  if (!entitlement.features.includes(feature)) {
    throw new IntegrationHttpError(
      403,
      'studio_feature_not_entitled',
      `The active Studio Pro plan does not include ${feature}.`
    );
  }
  return entitlement;
}

export async function createLicenseChallenge(
  context: DeviceContext,
  purpose: 'lease' | 'heartbeat' | 'deactivate',
  now = new Date()
) {
  const challenge = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + LICENSE_CHALLENGE_TTL_MS);
  const [row] = await db
    .insert(studioLicenseChallenge)
    .values({
      deviceId: context.device.id,
      purpose,
      challengeHash: sha256Hex(challenge),
      expiresAt,
    })
    .returning({ id: studioLicenseChallenge.id });
  return { id: row.id, challenge, purpose, expiresAt };
}

export async function consumeDeviceProof(input: {
  context: DeviceContext;
  purpose: 'lease' | 'heartbeat' | 'deactivate';
  challengeId: string;
  challenge: string;
  signature: string;
  payloadHash: string;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const [row] = await db
    .select()
    .from(studioLicenseChallenge)
    .where(
      and(
        eq(studioLicenseChallenge.id, input.challengeId),
        eq(studioLicenseChallenge.deviceId, input.context.device.id),
        eq(studioLicenseChallenge.purpose, input.purpose),
        isNull(studioLicenseChallenge.consumedAt),
        gt(studioLicenseChallenge.expiresAt, now)
      )
    )
    .limit(1);

  if (!row || !challengeMatches(input.challenge, row.challengeHash)) {
    throw new IntegrationHttpError(401, 'invalid_or_expired_device_challenge');
  }

  const message = deviceProofMessage({
    purpose: input.purpose,
    challengeId: input.challengeId,
    challenge: input.challenge,
    deviceId: input.context.device.id,
    stationId: input.context.station.id,
    payloadHash: input.payloadHash,
  });
  if (
    !verifyDeviceSignature({
      publicKeyBase64: input.context.device.devicePublicKey,
      message,
      signature: input.signature,
    })
  ) {
    throw new IntegrationHttpError(401, 'invalid_device_proof');
  }

  const [claimed] = await db
    .update(studioLicenseChallenge)
    .set({ consumedAt: now })
    .where(
      and(
        eq(studioLicenseChallenge.id, row.id),
        isNull(studioLicenseChallenge.consumedAt),
        gt(studioLicenseChallenge.expiresAt, now)
      )
    )
    .returning({ id: studioLicenseChallenge.id });
  if (!claimed) {
    throw new IntegrationHttpError(409, 'device_challenge_already_consumed');
  }
}

export async function issueStudioLicense(input: {
  context: DeviceContext;
  entitlement: StudioEntitlement;
  appVersion: string;
  buildChannel: 'stable' | 'beta';
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const window = calculateLeaseWindow(input.entitlement, now);
  if (!window) {
    throw new IntegrationHttpError(402, 'studio_license_inactive');
  }

  const leaseId = randomUUID();
  const claims = buildStudioLicenseClaims({
    leaseId,
    organizationId: input.context.organization.id,
    stationId: input.context.station.id,
    deviceId: input.context.device.id,
    deviceKeyFingerprint: input.context.device.deviceKeyFingerprint,
    entitlement: input.entitlement,
    onlineExpiresAt: window.onlineExpiresAt,
    offlineGraceUntil: window.offlineGraceUntil,
    now,
  });

  let signed: { token: string; keyId: string };
  try {
    signed = signStudioLicense(claims);
  } catch (error) {
    console.error('[studio-license] signing failed', error);
    throw new IntegrationHttpError(503, 'studio_license_signing_unavailable');
  }

  await db
    .update(studioLicenseLease)
    .set({ status: 'superseded', updatedAt: now })
    .where(
      and(
        eq(studioLicenseLease.deviceId, input.context.device.id),
        eq(studioLicenseLease.status, 'active')
      )
    );

  await db.insert(studioLicenseLease).values({
    id: leaseId,
    entitlementId: input.entitlement.id,
    organizationId: input.context.organization.id,
    stationId: input.context.station.id,
    deviceId: input.context.device.id,
    tokenHash: sha256Hex(signed.token),
    keyId: signed.keyId,
    planCode: input.entitlement.planCode,
    features: claims.features,
    appVersion: input.appVersion,
    buildChannel: input.buildChannel,
    onlineExpiresAt: window.onlineExpiresAt,
    offlineGraceUntil: window.offlineGraceUntil,
  });
  await db
    .update(stationDevice)
    .set({ lastLicenseIssuedAt: now, lastSeenAt: now, updatedAt: now })
    .where(eq(stationDevice.id, input.context.device.id));
  await recordLicenseEvent({
    organizationId: input.context.organization.id,
    stationId: input.context.station.id,
    deviceId: input.context.device.id,
    type: 'lease_issued',
    payload: {
      leaseId,
      planCode: input.entitlement.planCode,
      onlineExpiresAt: window.onlineExpiresAt.toISOString(),
      offlineGraceUntil: window.offlineGraceUntil.toISOString(),
    },
  });

  return { token: signed.token, claims, keyId: signed.keyId };
}

export async function requireCurrentLicenseLease(
  deviceId: string,
  leaseId: string,
  now = new Date()
): Promise<StudioLicenseLease> {
  const [lease] = await db
    .select()
    .from(studioLicenseLease)
    .where(
      and(
        eq(studioLicenseLease.id, leaseId),
        eq(studioLicenseLease.deviceId, deviceId),
        eq(studioLicenseLease.status, 'active'),
        gt(studioLicenseLease.onlineExpiresAt, now)
      )
    )
    .limit(1);
  if (!lease) throw new IntegrationHttpError(402, 'invalid_or_expired_online_lease');
  return lease;
}

export async function acquireOutputLease(input: {
  context: DeviceContext;
  licenseLeaseId: string;
  sessionId: string;
  outputId: string;
  appVersion: string;
  maxConcurrentOutputs: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + OUTPUT_HEARTBEAT_TTL_MS);
  const [existingSession] = await db
    .select({ deviceId: studioOutputLease.deviceId })
    .from(studioOutputLease)
    .where(eq(studioOutputLease.sessionId, input.sessionId))
    .limit(1);
  if (existingSession && existingSession.deviceId !== input.context.device.id) {
    throw new IntegrationHttpError(409, 'output_session_already_registered');
  }
  for (let slot = 1; slot <= input.maxConcurrentOutputs; slot += 1) {
    const [claimed] = await db
      .insert(studioOutputLease)
      .values({
        stationId: input.context.station.id,
        slot,
        deviceId: input.context.device.id,
        licenseLeaseId: input.licenseLeaseId,
        sessionId: input.sessionId,
        outputId: input.outputId,
        appVersion: input.appVersion,
        lastHeartbeatAt: now,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [studioOutputLease.stationId, studioOutputLease.slot],
        set: {
          deviceId: input.context.device.id,
          licenseLeaseId: input.licenseLeaseId,
          sessionId: input.sessionId,
          outputId: input.outputId,
          appVersion: input.appVersion,
          lastHeartbeatAt: now,
          expiresAt,
          updatedAt: now,
        },
        setWhere: or(
          lte(studioOutputLease.expiresAt, now),
          and(
            eq(studioOutputLease.deviceId, input.context.device.id),
            eq(studioOutputLease.sessionId, input.sessionId)
          )
        ),
      })
      .returning();
    if (claimed) return claimed;
  }

  throw new IntegrationHttpError(
    409,
    'concurrent_output_limit_reached',
    'Another authorized Studio Pro output currently owns the on-air slot.'
  );
}

export async function releaseOutputLease(deviceId: string, sessionId: string) {
  const [released] = await db
    .delete(studioOutputLease)
    .where(
      and(
        eq(studioOutputLease.deviceId, deviceId),
        eq(studioOutputLease.sessionId, sessionId)
      )
    )
    .returning({ id: studioOutputLease.id });
  return Boolean(released);
}

export async function revokeDeviceLicensing(input: {
  organizationId: string;
  stationId: string;
  deviceId: string;
  reason: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const [revokedDevice] = await db
    .update(stationDevice)
    .set({
      status: 'revoked',
      activationSlot: null,
      revokedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(stationDevice.id, input.deviceId),
        eq(stationDevice.stationId, input.stationId)
      )
    )
    .returning({ id: stationDevice.id });
  if (!revokedDevice) {
    throw new IntegrationHttpError(404, 'device_not_found');
  }
  await db
    .update(studioLicenseLease)
    .set({ status: 'revoked', revokedAt: now, updatedAt: now })
    .where(eq(studioLicenseLease.deviceId, input.deviceId));
  await db.delete(studioOutputLease).where(eq(studioOutputLease.deviceId, input.deviceId));
  await recordLicenseEvent({
    organizationId: input.organizationId,
    stationId: input.stationId,
    deviceId: input.deviceId,
    type: 'device_deactivated',
    payload: { reason: input.reason },
  });
}

export async function currentDeviceLease(deviceId: string) {
  const [lease] = await db
    .select()
    .from(studioLicenseLease)
    .where(eq(studioLicenseLease.deviceId, deviceId))
    .orderBy(desc(studioLicenseLease.createdAt))
    .limit(1);
  return lease ?? null;
}

export function entitlementResource(entitlement: StudioEntitlement) {
  const usableUntil = entitlementUsableUntil(entitlement);
  const usable = Boolean(usableUntil && usableUntil > new Date());
  return {
    id: entitlement.id,
    organizationId: entitlement.organizationId,
    status: entitlement.status,
    planCode: entitlement.planCode,
    features: entitlement.features,
    limits: {
      stations: entitlement.maxStations,
      devicesPerStation: entitlement.maxDevicesPerStation,
      concurrentOutputs: entitlement.maxConcurrentOutputs,
    },
    validUntil: entitlement.validUntil?.toISOString() ?? null,
    graceUntil: entitlement.graceUntil?.toISOString() ?? null,
    usable,
    usableUntil: usableUntil?.toISOString() ?? null,
    updatedAt: entitlement.updatedAt.toISOString(),
  };
}

async function recordLicenseEvent(input: {
  organizationId: string;
  stationId?: string;
  deviceId?: string;
  type: string;
  payload: Record<string, unknown>;
}) {
  await db.insert(studioLicenseEvent).values({
    organizationId: input.organizationId,
    stationId: input.stationId,
    deviceId: input.deviceId,
    type: input.type,
    payload: input.payload,
  });
}

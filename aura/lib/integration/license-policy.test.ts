import { describe, expect, it } from 'vitest';
import {
  buildStudioLicenseClaims,
  calculateLeaseWindow,
  LICENSE_OFFLINE_TTL_MS,
  LICENSE_ONLINE_TTL_MS,
} from './license-policy';

describe('Studio Pro license policy', () => {
  const now = new Date('2026-07-21T12:00:00.000Z');

  it('issues a 24-hour online lease with a seven-day offline ceiling', () => {
    const window = calculateLeaseWindow(
      { status: 'active', validUntil: null, graceUntil: null },
      now
    );
    expect(window?.onlineExpiresAt.getTime()).toBe(
      now.getTime() + LICENSE_ONLINE_TTL_MS
    );
    expect(window?.offlineGraceUntil.getTime()).toBe(
      now.getTime() + LICENSE_OFFLINE_TTL_MS
    );
  });

  it('never signs beyond the commercial grace deadline', () => {
    const graceUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const window = calculateLeaseWindow(
      { status: 'grace', validUntil: null, graceUntil },
      now
    );
    expect(window?.onlineExpiresAt).toEqual(graceUntil);
    expect(window?.offlineGraceUntil).toEqual(graceUntil);
  });

  it('fails closed for suspended and expired trials', () => {
    expect(
      calculateLeaseWindow(
        { status: 'suspended', validUntil: null, graceUntil: null },
        now
      )
    ).toBeNull();
    expect(
      calculateLeaseWindow(
        {
          status: 'trialing',
          validUntil: new Date(now.getTime() - 1),
          graceUntil: null,
        },
        now
      )
    ).toBeNull();
  });

  it('embeds device binding and safe degradation in signed claims', () => {
    const onlineExpiresAt = new Date(now.getTime() + LICENSE_ONLINE_TTL_MS);
    const offlineGraceUntil = new Date(now.getTime() + LICENSE_OFFLINE_TTL_MS);
    const claims = buildStudioLicenseClaims({
      leaseId: 'e7bb0e9b-ff3d-48b6-8355-f485741503ec',
      organizationId: 'a8ce9c36-ec59-4e83-a011-377951cb4986',
      stationId: 'd15ab02f-9b06-47e2-9086-79e399453c8d',
      deviceId: '79725216-0a37-48e7-8047-a0762a0da9e5',
      deviceKeyFingerprint: 'abc123',
      entitlement: {
        planCode: 'studio_pro',
        features: ['core_playout', 'aura_content'],
        maxDevicesPerStation: 2,
        maxConcurrentOutputs: 1,
      },
      onlineExpiresAt,
      offlineGraceUntil,
      now,
    });
    expect(claims.deviceKeyFingerprint).toBe('abc123');
    expect(claims.maxDevices).toBe(2);
    expect(claims.maxConcurrentOutputs).toBe(1);
    expect(claims.expirationMode).toBe('safe_restricted');
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import {
  bearerToken,
  createPairingCode,
  hashDeviceToken,
  hashPairingCode,
  issueDeviceCredentials,
  normalizePairingCode,
} from './device-credentials';

beforeAll(() => {
  process.env.DEVICE_TOKEN_PEPPER = 'test-only-device-pepper';
});

describe('Studio Pro device credentials', () => {
  it('creates human-readable, unambiguous pairing codes', () => {
    const code = createPairingCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(normalizePairingCode(code)).toHaveLength(8);
  });

  it('hashes normalized pairing codes consistently', () => {
    expect(hashPairingCode('ABCD-EFGH')).toBe(hashPairingCode('abcd efgh'));
  });

  it('issues distinct access and rotating refresh credentials', () => {
    const now = new Date('2026-07-21T12:00:00.000Z');
    const first = issueDeviceCredentials(now);
    const second = issueDeviceCredentials(now);

    expect(first.accessToken).toMatch(/^aura_at_/);
    expect(first.refreshToken).toMatch(/^aura_rt_/);
    expect(first.accessToken).not.toBe(second.accessToken);
    expect(first.refreshToken).not.toBe(second.refreshToken);
    expect(hashDeviceToken(first.accessToken)).toBe(first.accessTokenHash);
    expect(first.accessTokenExpiresAt.getTime()).toBeGreaterThan(now.getTime());
    expect(first.refreshTokenExpiresAt.getTime()).toBeGreaterThan(
      first.accessTokenExpiresAt.getTime()
    );
  });

  it('parses one strict bearer credential', () => {
    const request = new Request('https://www.aurapress.app/api/v1/device', {
      headers: { Authorization: 'Bearer aura_at_example' },
    });
    expect(bearerToken(request)).toBe('aura_at_example');
  });
});

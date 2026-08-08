import { beforeAll, describe, expect, it } from 'vitest';
import {
  extractPairingClientIp,
  nextPairingRateLimitState,
  pairingRateLimitBucketKey,
  pairingRateLimitRetryAfter,
  type PairingRateLimitPolicy,
} from './pairing-rate-limit-policy';

const policy: PairingRateLimitPolicy = {
  limit: 2,
  windowSeconds: 600,
};

beforeAll(() => {
  process.env.DEVICE_TOKEN_PEPPER = 'test-only-device-pepper';
});

describe('Studio Pro pairing rate-limit policy', () => {
  const start = new Date('2026-07-21T12:00:00.000Z');

  it('allows attempts through the limit, then locks until the window ends', () => {
    const first = nextPairingRateLimitState(null, policy, start);
    const second = nextPairingRateLimitState(
      first,
      policy,
      new Date(start.getTime() + 1_000)
    );
    const thirdAt = new Date(start.getTime() + 2_000);
    const third = nextPairingRateLimitState(second, policy, thirdAt);

    expect(first.attemptCount).toBe(1);
    expect(second.attemptCount).toBe(2);
    expect(third.attemptCount).toBe(3);
    expect(pairingRateLimitRetryAfter(third.blockedUntil, thirdAt)).toBe(598);
  });

  it('does not extend a live block merely because the client retries early', () => {
    const blockedUntil = new Date(start.getTime() + 60_000);
    const previous = { attemptCount: 3, windowStartedAt: start, blockedUntil };
    const next = nextPairingRateLimitState(
      previous,
      policy,
      new Date(start.getTime() + 10_000)
    );

    expect(next).toEqual(previous);
  });

  it('resets after the rolling window', () => {
    const resetAt = new Date(start.getTime() + policy.windowSeconds * 1000);
    const reset = nextPairingRateLimitState(
      {
        attemptCount: 20,
        windowStartedAt: start,
        blockedUntil: new Date(start.getTime() + 60_000),
      },
      policy,
      resetAt
    );
    expect(reset).toEqual({
      attemptCount: 1,
      windowStartedAt: resetAt,
      blockedUntil: null,
    });
  });

  it('uses the leftmost forwarded IP and stores only deterministic HMAC keys', () => {
    const req = new Request('https://www.aurapress.app/api/v1/device-pairings/exchange', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    });
    expect(extractPairingClientIp(req)).toBe('203.0.113.7');

    const key = pairingRateLimitBucketKey('ip', '203.0.113.7');
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain('203.0.113.7');
    expect(key).not.toBe(pairingRateLimitBucketKey('code', '203.0.113.7'));
  });
});

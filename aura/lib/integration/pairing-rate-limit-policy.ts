import { createHmac } from 'node:crypto';

export type PairingRateLimitScope = 'ip' | 'code' | 'station';

export interface PairingRateLimitPolicy {
  limit: number;
  windowSeconds: number;
}

export const PAIRING_RATE_LIMIT_POLICIES: Record<
  PairingRateLimitScope,
  PairingRateLimitPolicy
> = {
  // The IP bucket stops broad code-space scanning from one origin.
  ip: {
    limit: 20,
    windowSeconds: 10 * 60,
  },
  // The code bucket also works across distributed source addresses.
  code: {
    limit: 6,
    windowSeconds: 10 * 60,
  },
  // Once a valid code identifies its station, cap aggregate activation churn.
  station: {
    limit: 10,
    windowSeconds: 10 * 60,
  },
};

export interface PairingRateLimitState {
  attemptCount: number;
  windowStartedAt: Date;
  blockedUntil: Date | null;
}

/**
 * Pure reference policy used by tests and mirrored by the atomic PostgreSQL
 * upsert. The first request over the limit locks the bucket until the fixed
 * window ends, making Retry-After both honest and predictable.
 */
export function nextPairingRateLimitState(
  previous: PairingRateLimitState | null,
  policy: PairingRateLimitPolicy,
  now: Date
): PairingRateLimitState {
  if (previous?.blockedUntil && previous.blockedUntil > now) {
    return previous;
  }

  if (
    !previous ||
    now.getTime() - previous.windowStartedAt.getTime() >=
      policy.windowSeconds * 1000
  ) {
    return { attemptCount: 1, windowStartedAt: now, blockedUntil: null };
  }

  const attemptCount = previous.attemptCount + 1;
  if (attemptCount <= policy.limit) {
    return { ...previous, attemptCount, blockedUntil: null };
  }

  return {
    ...previous,
    attemptCount,
    blockedUntil: new Date(
      previous.windowStartedAt.getTime() + policy.windowSeconds * 1000
    ),
  };
}

export function extractPairingClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

/** Returns an opaque DB key; the source IP/code is never persisted. */
export function pairingRateLimitBucketKey(
  scope: PairingRateLimitScope,
  subject: string
): string {
  const secret =
    process.env.DEVICE_TOKEN_PEPPER ??
    process.env.SECRETS_KEY ??
    process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'DEVICE_TOKEN_PEPPER, SECRETS_KEY or BETTER_AUTH_SECRET must be configured'
    );
  }
  return createHmac('sha256', secret)
    .update(`pairing-rate-limit:${scope}:${subject}`)
    .digest('hex');
}

export function pairingRateLimitRetryAfter(
  blockedUntil: Date | null,
  now: Date
): number | null {
  if (!blockedUntil || blockedUntil <= now) return null;
  return Math.max(1, Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000));
}

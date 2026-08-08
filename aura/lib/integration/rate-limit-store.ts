import 'server-only';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { rateLimit } from '@/lib/db/schema';
import { IntegrationHttpError } from '@/lib/integration/authorization';
import { rateBucket, windowStartMs } from '@/lib/integration/rate-limit';

/**
 * Durable fixed-window rate limiter backed by the `rate_limit` table (works
 * across serverless instances, unlike in-memory). Each call atomically
 * increments the counter for the current window and throws
 * `IntegrationHttpError(429, 'rate_limited')` once it exceeds `limit`.
 */
export async function enforceRateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
  now?: Date;
}): Promise<void> {
  const nowMs = (opts.now ?? new Date()).getTime();
  const start = windowStartMs(nowMs, opts.windowMs);
  const bucket = rateBucket(opts.key, start);
  const expiresAt = new Date(start + opts.windowMs);

  const [row] = await db
    .insert(rateLimit)
    .values({ bucket, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: rateLimit.bucket,
      set: { count: sql`${rateLimit.count} + 1` },
    })
    .returning({ count: rateLimit.count });

  if (row && row.count > opts.limit) {
    throw new IntegrationHttpError(
      429,
      'rate_limited',
      'Too many requests. Please try again shortly.'
    );
  }
}

/**
 * Best-effort client key for rate limiting: the salted hash of the caller's
 * IP (from `x-forwarded-for` / `x-real-ip`). Hashed so no raw IP is persisted.
 * Falls back to a constant bucket when no IP is available — that only makes
 * the limit stricter, never bypassable.
 */
export function rateLimitClientKey(req: Request, scope: string): string {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  const ip = fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const salt =
    process.env.DEVICE_TOKEN_PEPPER ??
    process.env.SECRETS_KEY ??
    process.env.BETTER_AUTH_SECRET ??
    'aura';
  const ipHash = createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
  return `${scope}:${ipHash}`;
}

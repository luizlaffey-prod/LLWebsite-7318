import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  PAIRING_RATE_LIMIT_POLICIES,
  pairingRateLimitBucketKey,
  pairingRateLimitRetryAfter,
  type PairingRateLimitScope,
} from './pairing-rate-limit-policy';

interface PairingRateLimitRow extends Record<string, unknown> {
  attempt_count: number;
  blocked_until: Date | string | null;
}

export type PairingRateLimitResult =
  | { limited: false; retryAfterSeconds: null }
  | { limited: true; retryAfterSeconds: number };

/**
 * Atomically consumes one rate-limit attempt. PostgreSQL serializes competing
 * upserts for the same primary key, preventing parallel requests from racing
 * through a separate count-then-insert sequence.
 */
export async function consumePairingRateLimit(
  scope: PairingRateLimitScope,
  subject: string,
  now = new Date()
): Promise<PairingRateLimitResult> {
  const policy = PAIRING_RATE_LIMIT_POLICIES[scope];
  const bucketKey = pairingRateLimitBucketKey(scope, subject);
  const windowCutoff = new Date(now.getTime() - policy.windowSeconds * 1000);

  const result = await db.execute<PairingRateLimitRow>(sql`
    INSERT INTO "device_pairing_rate_limit" (
      "bucket_key",
      "attempt_count",
      "window_started_at",
      "blocked_until",
      "updated_at"
    )
    VALUES (${bucketKey}, 1, ${now}, NULL, ${now})
    ON CONFLICT ("bucket_key") DO UPDATE SET
      "attempt_count" = CASE
        WHEN "device_pairing_rate_limit"."blocked_until" > ${now}
          THEN "device_pairing_rate_limit"."attempt_count"
        WHEN "device_pairing_rate_limit"."window_started_at" <= ${windowCutoff}
          THEN 1
        ELSE "device_pairing_rate_limit"."attempt_count" + 1
      END,
      "window_started_at" = CASE
        WHEN "device_pairing_rate_limit"."blocked_until" > ${now}
          THEN "device_pairing_rate_limit"."window_started_at"
        WHEN "device_pairing_rate_limit"."window_started_at" <= ${windowCutoff}
          THEN ${now}
        ELSE "device_pairing_rate_limit"."window_started_at"
      END,
      "blocked_until" = CASE
        WHEN "device_pairing_rate_limit"."blocked_until" > ${now}
          THEN "device_pairing_rate_limit"."blocked_until"
        WHEN "device_pairing_rate_limit"."window_started_at" <= ${windowCutoff}
          THEN NULL
        WHEN "device_pairing_rate_limit"."attempt_count" + 1 > ${policy.limit}
          THEN ${now}::timestamptz + (
            LEAST(
              ${policy.maxBackoffSeconds}::double precision,
              ${policy.baseBackoffSeconds}::double precision * POWER(
                2,
                LEAST(
                  8,
                  GREATEST(
                    0,
                    "device_pairing_rate_limit"."attempt_count" + 1 - ${policy.limit} - 1
                  )
                )
              )
            ) * INTERVAL '1 second'
          )
        ELSE NULL
      END,
      "updated_at" = ${now}
    RETURNING "attempt_count", "blocked_until"
  `);

  const row = result.rows?.[0];
  if (!row) throw new Error('pairing_rate_limit_update_failed');
  const blockedUntil = row.blocked_until
    ? new Date(row.blocked_until)
    : null;
  const retryAfterSeconds = pairingRateLimitRetryAfter(blockedUntil, now);
  return retryAfterSeconds === null
    ? { limited: false, retryAfterSeconds: null }
    : { limited: true, retryAfterSeconds };
}

export function pairingRateLimitedResponse(retryAfterSeconds: number): Response {
  return Response.json(
    {
      error: 'pairing_rate_limited',
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

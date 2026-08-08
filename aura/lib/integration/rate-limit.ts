/**
 * Pure fixed-window rate-limit math (no DB). The durable store lives in
 * ./rate-limit-store; splitting the window arithmetic here keeps it unit-
 * testable.
 */

/** Start (epoch ms) of the fixed window containing `nowMs`. */
export function windowStartMs(nowMs: number, windowMs: number): number {
  return Math.floor(nowMs / windowMs) * windowMs;
}

/** Storage key for a (logical key, window) pair. */
export function rateBucket(key: string, windowStart: number): string {
  return `${key}:${windowStart}`;
}

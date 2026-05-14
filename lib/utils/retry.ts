export type FetchLike = (...args: Parameters<typeof fetch>) => Promise<Response>;

interface RetryOptions {
  /** Delays in ms between retries (length = max retries). */
  delays?: number[];
  /** HTTP statuses to retry. Defaults to [503]. */
  retryOn?: number[];
  /** HTTP statuses to surface immediately as a user-friendly error. */
  failFast?: number[];
  /** Total request timeout in ms (per attempt). */
  timeoutMs?: number;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseText?: string
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

const DEFAULT_DELAYS = [2000, 4000, 8000];

/**
 * Calls fetch with a 503-aware exponential backoff. Pattern mirrored from the
 * AURA Skip-based prototype: retry 503 up to 3 times (2s/4s/8s), fail-fast on
 * 400/401/404/429 with the response body for caller to translate.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  opts: RetryOptions = {}
): Promise<Response> {
  const delays = opts.delays ?? DEFAULT_DELAYS;
  const retryOn = opts.retryOn ?? [503];
  const failFast = opts.failFast ?? [400, 401, 404, 429];
  const timeoutMs = opts.timeoutMs ?? 60_000;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) return res;
      if (failFast.includes(res.status)) {
        const text = await res.text().catch(() => '');
        throw new FetchError(`upstream ${res.status}`, res.status, text);
      }
      if (retryOn.includes(res.status) && attempt < delays.length) {
        await sleep(delays[attempt]);
        attempt++;
        continue;
      }

      const text = await res.text().catch(() => '');
      throw new FetchError(`upstream ${res.status}`, res.status, text);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof FetchError) throw err;
      if (attempt < delays.length) {
        await sleep(delays[attempt]);
        attempt++;
        continue;
      }
      throw new FetchError(
        err instanceof Error ? err.message : 'fetch failed',
        0
      );
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
